const { Client, Users, ID, Databases, Query  } = require('node-appwrite');
const fs = require('fs');

require('dotenv').config();

const SESSION_ID = process.argv[2]// "test_session"
const MAX_REQ_PER_TASK = parseInt(process.argv[3])  // how many request to send per task per client
const MAX_REQ = parseInt(process.argv[4])              // how many request in total to give to clients
const NBR_WORKERS = process.argv[5]
const RUN_MODE = process.argv[6]
const COLLECTION_ID = process.argv[7]
const SESSION_ID_POST = process.argv[8] // to read log from

console.log(RUN_MODE)
const { 
    rand_str, sleep_ms, write_array_of_results_to_file,
    req_start_collecting_stat, req_stop_collecting_stat,
    create_new_collection, delete_all_collections, 
    create_attr_for_collection, get_document_and_record_rtt,
    create_document_and_record_rtt,
} = require('./helpers');

var cluster = require('cluster');
cluster.schedulingPolicy = cluster.SCHED_NONE;
const totalCPUs = require("os").cpus().length;

const client = new Client();
client.setSelfSigned();
client
    .setEndpoint(process.env.APPWRITE_API_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT)
    .setKey(process.env.APPWRITE_API_KEY)

const databases = new Databases(client);

const { readdir } = require('fs/promises');
const { once } = require('node:events');
const { createReadStream } = require('node:fs');
const { createInterface } = require('node:readline');
const { Console } = require('console');

async function extract_doc_id_from_log_file(file_path) {
    try {
        let ids = []
        const rl = createInterface({
            input: createReadStream(file_path),
            crlfDelay: Infinity,
        });

        rl.on('line', (line) => {
            // Process the line.
            ids.push(JSON.parse(line).doc_id)
        });

        await once(rl, 'close');

        console.log(`File processed: ${file_path}`);
        return ids
    } catch (err) {
        console.error(err);
        return []
    }
};

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

const extract_doc_id_from_log_files = async (array) => {
    const allAsyncResults = []

    for (const item of array) {
        const asyncResult = await extract_doc_id_from_log_file(item)
        shuffleArray(asyncResult)
        allAsyncResults.push(asyncResult)
    }

    return allAsyncResults
}

// let session_id = "session1"
let reg =  new RegExp('log_client_\\d+_' + SESSION_ID_POST + '.txt', 'i');



function get_x_random_id_from_2d_array(x, array) {
    let ids = []
    if (array) {
        while (ids.length<x) {
            let a = Math.round(Math.random()*array.length)
            if(array[a]) {
                let b = Math.round(Math.random()*array[a].length)
                let v2 = array[a][b]
                ids.push(v2)
            }
        }
    }
    return ids
}

const getDirectories = async source =>
    (await readdir(source, { withFileTypes: true }))
        .filter(item => !item.isDirectory())
        .filter(item => reg.test(item.name))
        .map(item => source + item.name)


/**
 * 
 * @param {String} session_id 
 * @param {int} worker_id 
 * @param {int} number_of_request 
 */
async function request_worker(COLLECTION_ID, session_id, worker_id, doc_ids, start_id) {
    // request_worker(COLLECTION_ID, SESSION_ID, cluster.worker.id, msg.doc_ids, msg.start_id)
    // Sometime param can be null
    if (!COLLECTION_ID || !session_id) {
        await sleep_ms(10)
        return `request_worker error: some param null!: COLLECTION_ID=${COLLECTION_ID}, session_id=${session_id}, start_id=${start_id}`
    }
    // await sleep_ms(100)

    let result_all_requests = []
    for (let i=0; i<doc_ids.length; i++) {
        get_document_and_record_rtt(
            databases, process.env.APPWRITE_DATABASE, COLLECTION_ID, doc_ids[i], i + start_id
        )
            .then(result => { result_all_requests.push(result) })
            .catch(e => { console.log(e); return e })
        // result_all_requests.push({"worker_id": worker_id, "req_id": i + start_id, "doc_id": doc_ids[i]})
        await sleep_ms(10)
    }

    let has_exported_data = false
    let filename = `log_client_${worker_id - 1}_${session_id}.txt`
    while (!has_exported_data) {
        if (result_all_requests.length == doc_ids.length) {
            // console.log(result_all_requests)
            write_array_of_results_to_file(result_all_requests, filename, is_2d = false, is_append = true)
                .then(r => {
                    // console.log(`-- worker_id=[${worker_id}] Done writing data to file filename=${filename}`);
                    has_exported_data = true
                })
        }
        await sleep_ms(10)
    }

    return ""
}


async function handle_master(all_doc_ids_2d) {
    // let COLLECTION_ID = await clear_appwrite()

    console.log(`++ Number of CPUs is ${totalCPUs}`);
    console.log(`++ Master ${process.pid} is running`);
    let res_start = await req_start_collecting_stat(SESSION_ID).catch(e => { console.log({error: e}); return })
    console.log("## Sent req_start_collecting_stat")
    let current_id = 0
    let current_req_th = 0
    let nbr_task_done = 0

    // Fork workers.
    let workers = []
    for (var i = 0; i < NBR_WORKERS; i++) {
        let worker = cluster.fork();
        worker.on('message', function (msg) {
            if ("start_id" in msg) {
                if (!("task_error" in msg)) {
                    // Task successed. Assign new task
                    nbr_task_done += 1            
                    if (current_req_th + MAX_REQ_PER_TASK <= (MAX_REQ-1)) {
                        current_req_th += MAX_REQ_PER_TASK
                        if (RUN_MODE == "debug") {
                            console.log(`++ Master => ${msg.worker_id}: ok, new start_id=${current_req_th}`)
                        }
                        worker.send({
                            "COLLECTION_ID": COLLECTION_ID, 
                            doc_ids: get_x_random_id_from_2d_array(MAX_REQ_PER_TASK, all_doc_ids_2d),
                            "start_id": current_req_th, "worker_id": msg.worker_id,
                        })
                        // console.log(`-----------------------assigned worker i=${msg.worker_id} current_req_th=${current_req_th}`)
                    }
                } else {
                    // error occured. re-assign task
                    if (RUN_MODE == "debug") {
                        console.log(`++ Master => ${msg.worker_id}: Repeat start_id=${msg.start_id}`)
                    }
                    worker.send({
                        "COLLECTION_ID": COLLECTION_ID, 
                        doc_ids: get_x_random_id_from_2d_array(MAX_REQ_PER_TASK, all_doc_ids_2d),
                        "start_id": msg.start_id, "worker_id": msg.worker_id
                    })
                }
            }
        })
        workers.push(worker)
    }
    console.log(`++ Initiated ${NBR_WORKERS} workers. Start assigning tasks ...`)
    
    for (let i=0; i<NBR_WORKERS; i++) {
        workers[i].send({
            "start_id": current_req_th, 
            doc_ids: get_x_random_id_from_2d_array(MAX_REQ_PER_TASK, all_doc_ids_2d)
        })
        if (i != (NBR_WORKERS-1)) {
            current_req_th += MAX_REQ_PER_TASK
        }
        // console.log(`-----------------------assigned worker i=${i} current_req_th=${current_req_th}`)
        // await sleep_ms(100)
    }
    
    while (true) {
        // console.log(nbr_task_done, MAX_REQ/MAX_REQ_PER_TASK)
        if (nbr_task_done == MAX_REQ/MAX_REQ_PER_TASK) {
            req_stop_collecting_stat(SESSION_ID)
                .then(r => {console.log("## Sent req_stop_collecting_stat"); process.exit()})
                .catch(e => { console.log({ error: e }) })
            // console.log("Done. Exiting ...")
            // process.exit()
            break
        }
        await sleep_ms(10)
    }
}

// let log_source = './'
// let client_log_path = fs.readdirSync(log_source, { withFileTypes: true })
//     .filter(item => !item.isDirectory())
//     .filter(item => reg.test(item.name))
//     .map(item => log_source + item.name)
// console.log(client_log_path)

async function main() {
    if (cluster.isMaster) {
        let client_log_path = await getDirectories('./')
        console.log(client_log_path)
        let doc_ids = await extract_doc_id_from_log_files(client_log_path)
        await handle_master(doc_ids)
    } else {
        if (RUN_MODE == "debug") {
            console.log(`-- Worker ${cluster.worker.id} started.`)
        }
        process.on("message", (msg) => {
            // console.log(process.pid)
            if ("exit_now" in msg) {
                // Exit  
            } else if ("start_id" in msg) {
                // console.log(cluster.worker.id)
                request_worker(COLLECTION_ID, SESSION_ID, cluster.worker.id, msg.doc_ids, msg.start_id)
                    .then(r => {
                        if (!r) {
                            if (RUN_MODE == "debug") {
                                console.log(`-- Worker ${cluster.worker.id} done: ` + 
                                    `number_of_request=${msg.doc_ids.length}, start_id=${msg.start_id}`)
                            }
                            process.send({ 
                                worker_id: cluster.worker.id, 
                                doc_ids: msg.doc_ids, start_id: msg.start_id 
                            });
                        } else {
                            if (RUN_MODE == "debug") {
                                console.log(`-- Worker ${cluster.worker.id} ERROR: ` + 
                                    `number_of_request=${msg.doc_ids.length}, start_id=${msg.start_id}: ${r}`)
                            }
                            process.send({ 
                                worker_id: cluster.worker.id, 
                                doc_ids: msg.doc_ids, start_id: msg.start_id, 
                                task_error: r 
                            });
                        }
                    })
            }
        })
    }
}


main()