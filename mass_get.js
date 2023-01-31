const { Client, Users, ID, Databases, Query  } = require('node-appwrite');
const fs = require('fs');

require('dotenv').config();

let SERVER_ADDR  = process.env.SERVER_ADDR

const { 
    rand_str, sleep_ms, write_array_of_results_to_file,
    req_start_collecting_stat, req_stop_collecting_stat,
    create_new_collection, delete_all_collections, 
    create_attr_for_collection, 
    create_document_and_record_rtt,
} = require('./helpers');


const SESSION_ID = process.argv[2]
const COLLECTION_ID = process.argv[3]

const client = new Client();
client.setSelfSigned();
client
    .setEndpoint(process.env.APPWRITE_API_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT)
    .setKey(process.env.APPWRITE_API_KEY)

const databases = new Databases(client);

// const file_paths = [
//   "log_client_0_session1.txt",
//   "log_client_1_session1.txt",
// ];

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

const extract_doc_id_from_log_files = async (array) => {
    const allAsyncResults = []

    for (const item of array) {
        const asyncResult = await extract_doc_id_from_log_file(item)
        allAsyncResults.push(...asyncResult)
    }

    return allAsyncResults
}

let session_id = "session1"
let reg =  new RegExp('log_client_\\d+_' + session_id + '.txt', 'i');

let client_log_path = fs.readdirSync('./2M_post', { withFileTypes: true })
    .filter(item => !item.isDirectory())
    .filter(item => reg.test(item.name))
    .map(item => item.name)
// console.log(client_log_path)


extract_doc_id_from_log_files(client_log_path).then(r => console.log(r.length))

/**
 * 
 * @param {String} session_id 
 * @param {int} worker_id 
 * @param {int} number_of_request 
 */
async function request_worker(COLLECTION_ID, session_id, worker_id, number_of_request, start_id) {

    // Sometime param can be null
    if (!COLLECTION_ID || !session_id) {
        await sleep_ms(10)
        return `request_worker error: some param null!: COLLECTION_ID=${COLLECTION_ID}, session_id=${session_id}, start_id=${start_id}`
    }

    let result_all_requests = []

    for (let i = 0; i < number_of_request; i++) {
        data = {}
        for (let j = max_attr - 1; j >= 0; j--) {
            data["key_" + j] = "iteration_chunk_th=" + (i + start_id) + "_shard_th=" + 0
        }
        create_document_and_record_rtt(
            databases, process.env.APPWRITE_DATABASE, COLLECTION_ID, data, i + start_id, 0
        )
            .then(result => { result_all_requests.push(result) })
            .catch(e => { console.log(e); return e })
        await sleep_ms(10)
    }
    
    let has_exported_data = false
    let filename = `log_client_${worker_id - 1}_${session_id}.txt`
    while (!has_exported_data) {
        if (number_of_request == result_all_requests.length) {
            // console.log(result_all_requests)
            // console.log("## All chunks resolved")
            write_array_of_results_to_file(result_all_requests, filename, is_2d = false, is_append = true)
                .then(r => {
                    // console.log("-- Done writing data to file filename=" + filename);
                    has_exported_data = true
                })
        }
        await sleep_ms(10)
    }

    return ""
}


async function handle_master() {
    let COLLECTION_ID = await clear_appwrite()

    console.log(`++ Number of CPUs is ${totalCPUs}`);
    console.log(`++ Master ${process.pid} is running`);
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
                    // console.log(msg)
                    // console.log(current_req_th, nbr_task_done*MAX_REQ_PER_TASK, nbr_task_done)
                    
                    if (current_req_th + MAX_REQ_PER_TASK <= MAX_REQ) {
                        current_req_th += MAX_REQ_PER_TASK
                        if (RUN_MODE == "debug") {
                            console.log(`++ Master => ${msg.worker_id}: ok, new start_id=${current_req_th}`)
                        }
                        worker.send({
                            "COLLECTION_ID": COLLECTION_ID, "number_of_request": MAX_REQ_PER_TASK, 
                            "start_id": current_req_th, "worker_id": msg.worker_id
                        })
                    }
                } else {
                    // error occured. re-assign task
                    if (RUN_MODE == "debug") {
                        console.log(`++ Master => ${msg.worker_id}: Repeat start_id=${msg.start_id}`)
                    }
                    worker.send({
                        "COLLECTION_ID": COLLECTION_ID, "number_of_request": MAX_REQ_PER_TASK, 
                        "start_id": msg.start_id, "worker_id": msg.worker_id
                    })
                }
            }
        })
        workers.push(worker)
    }
    console.log(`++ Initiated ${NBR_WORKERS} workers. Start assigning tasks ...`)
    
    for (let i=0; i<NBR_WORKERS; i++) {
        // Don't set MAX_REQ << MAX_REQ_PER_TASK*10, because the worker.on('message') might have been executed!
        // and thus already bumps current_req_th simultaneously 
        workers[i].send({"start_id": current_req_th, "number_of_request": MAX_REQ_PER_TASK})
        current_req_th += MAX_REQ_PER_TASK
        await sleep_ms(100)
    }
    
    while (true) {
        // console.log(task_th_done)
        if (nbr_task_done == MAX_REQ/MAX_REQ_PER_TASK) {
            req_stop_collecting_stat(SESSION_ID)
                .then(r => {console.log("## Sent req_stop_collecting_stat"); process.exit()})
                .catch(e => { console.log({ error: e }) })

            break
        }
        await sleep_ms(10)
    }
}

async function main() {
    if (cluster.isMaster) {
        await handle_master()
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
                request_worker(COLLECTION_ID, SESSION_ID, cluster.worker.id, msg.number_of_request, msg.start_id)
                    .then(r => {
                        if (!r) {
                            if (RUN_MODE == "debug") {
                                console.log(`-- Worker ${cluster.worker.id} done: ` + 
                                    `number_of_request=${msg.number_of_request}, start_id=${msg.start_id}`)
                            }
                            process.send({ 
                                worker_id: cluster.worker.id, 
                                number_of_request: msg.number_of_request, start_id: msg.start_id 
                            });
                        } else {
                            if (RUN_MODE == "debug") {
                                console.log(`-- Worker ${cluster.worker.id} ERROR: ` + 
                                    `number_of_request=${msg.number_of_request}, start_id=${msg.start_id}: ${r}`)
                            }
                            process.send({ 
                                worker_id: cluster.worker.id, 
                                number_of_request: msg.number_of_request, start_id: msg.start_id, 
                                task_error: r 
                            });
                        }
                    })
            }
        })
    }
}


// main()