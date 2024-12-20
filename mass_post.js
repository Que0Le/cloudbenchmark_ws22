var cluster = require('cluster');
var http = require('http');
const totalCPUs = require("os").cpus().length;
const { Client, Users, ID, Databases } = require('node-appwrite');
const fs = require('fs');
var crypto = require("crypto");

require('dotenv').config();

const { 
    rand_str, sleep_ms, write_array_of_results_to_file,
    req_start_collecting_stat, req_stop_collecting_stat,
    create_new_collection, delete_all_collections, 
    create_attr_for_collection, 
    create_document_and_record_rtt
} = require('./helpers');

// Gather parameters
// Usually looks like: post.workers=10.task_size=10.total=1000000.column_length=100
const SESSION_ID = process.argv[2]                  
const MAX_REQ_PER_TASK = parseInt(process.argv[3])     // how many request to send per task per slave
const MAX_REQ = parseInt(process.argv[4])              // how many request in total
const NBR_WORKERS = process.argv[5]                    // Number of workers
const RUN_MODE = process.argv[6]                       // silent/debug -> print error
// 1/2 length of string. @see generate_random_string_half_len
const DB_DATA_HALF_LENGTH = Math.round(parseInt(process.argv[7])/2)   
const max_attr = 10                                     // How many columns in Collection

// Appwrite SDK init
const client = new Client();
client.setSelfSigned();

const databases = new Databases(client);
client
    .setEndpoint(process.env.APPWRITE_API_ENDPOINT) // Your API Endpoint
    .setProject(process.env.APPWRITE_PROJECT) // Your project ID
    .setKey(process.env.APPWRITE_API_KEY)
;

// Set worker param
cluster.schedulingPolicy = cluster.SCHED_NONE;


/**
 * 
 * @param {int} half_len 
 * @returns random string length=len*2
 */
function generate_random_string_half_len(half_len) {
    return crypto.randomBytes(half_len).toString('hex')
}


/**
 * Clear all collection from DB. 
 * During development we deleted all other collection. Now commented out
 * @returns 
 */
async function clear_appwrite() {
    // await delete_all_collections(databases, process.env.APPWRITE_DATABASE).catch(e => {
    //     console.log("Error delete_all_collections:")
    //     console.log(e)
    // })
    let COLLECTION_ID = await create_new_collection(databases, process.env.APPWRITE_DATABASE).catch(e => {
        console.log("Error create_new_collection:")
        console.log(e)
    })
    console.log("\nCOLLECTION_ID=" + COLLECTION_ID);

    attrs = []
    for (let i=0; i<max_attr; i++) {
        attrs.push({"attr_key": "key_" + i, "attr_size": 255, "attr_required": true})
    }
    let created_attrs = await create_attr_for_collection(databases, process.env.APPWRITE_DATABASE, COLLECTION_ID, attrs)
        .catch(e => {
            console.log("Error create_attr_for_collection:")
            console.log(e)
        })
    console.log("## CREATED " + created_attrs.length + " attrs")

    await sleep_ms(2000)

    // Inform test server to start collecting system status
    let res_start = await req_start_collecting_stat(SESSION_ID).catch(e => { console.log({error: e}); return })
    console.log("## Sent req_start_collecting_stat")
    console.log(res_start)
    await sleep_ms(100)

    return COLLECTION_ID
}


/**
 * Handle the request transmission
 * @param {String} COLLECTION_ID 
 * @param {String} session_id           
 * @param {int} worker_id               
 * @param {int} number_of_request       // how many req to send
 * @param {int} start_id                // starting from this number
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
            // data["key_" + j] = "iteration_chunk_th=" + (i + start_id) + "_shard_th=" + 0
            data["key_" + j] = generate_random_string_half_len(DB_DATA_HALF_LENGTH)
        }
        create_document_and_record_rtt(
            databases, process.env.APPWRITE_DATABASE, COLLECTION_ID, data, i + start_id, 0
        )
            .then(result => { result_all_requests.push(result) })
            .catch(e => { console.log(e); return e })
        await sleep_ms(10)
    }
    
    let has_exported_data = false
    let filename = `${process.env.LOG_DATA_DIR}/log_client_${worker_id - 1}_${session_id}.txt`
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
        if (nbr_task_done%1000==0) {
            console.log(`nbr_task_done: ${nbr_task_done} / MAX_REQ/MAX_REQ_PER_TASK: ${MAX_REQ/MAX_REQ_PER_TASK}`)
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
                request_worker(msg.COLLECTION_ID, SESSION_ID, cluster.worker.id, msg.number_of_request, msg.start_id)
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


main()