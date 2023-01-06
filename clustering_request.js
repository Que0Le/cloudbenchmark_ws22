var cluster = require('cluster');
var http = require('http');
const totalCPUs = require("os").cpus().length;
const { Client, Users, ID, Databases } = require('node-appwrite');
const fs = require('fs');

require('dotenv').config();

const { 
    rand_str, sleep_ms, write_array_of_results_to_file,
    req_start_collecting_stat, req_stop_collecting_stat,
    create_new_collection, delete_all_collections, 
    create_attr_for_collection, 
    create_document_and_record_rtt
} = require('./helpers');

const client = new Client();
client.setSelfSigned();

const databases = new Databases(client);
// databases.createStringAttribute('[DATABASE_ID]', '[COLLECTION_ID]', '', 1, false);
client
    .setEndpoint(process.env.APPWRITE_API_ENDPOINT) // Your API Endpoint
    .setProject(process.env.APPWRITE_PROJECT) // Your project ID
    .setKey(process.env.APPWRITE_API_KEY)
;

cluster.schedulingPolicy = cluster.SCHED_NONE;

let max_attr = 10
async function clear_appwrite() {
    await delete_all_collections(databases, process.env.APPWRITE_DATABASE).catch(e => {
        console.log("Error delete_all_collections:")
        console.log(e)
    })
    let COLLECTION_ID = await create_new_collection(databases, process.env.APPWRITE_DATABASE).catch(e => {
        console.log("Error create_new_collection:")
        console.log(e)
    })
    console.log("## CREATED COLLECTION_ID=" + COLLECTION_ID);

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
    let res_start = await req_start_collecting_stat(session_id).catch(e => { console.log({error: e}); return })
    console.log("## Sent req_start_collecting_stat")
    console.log(res_start)
    await sleep_ms(100)

    return COLLECTION_ID
}
// clear_appwrite()

/**
 * 
 * @param {String} session_id 
 * @param {int} worker_id 
 * @param {int} number_of_request 
 */
async function request_worker(COLLECTION_ID, session_id, worker_id, number_of_request) {
    // await sleep_ms(100)

    let result_all_requests = []

    for (let i = 0; i < number_of_request; i++) {
        data = {}
        for (let j = max_attr - 1; j >= 0; j--) {
            data["key_" + j] = "iteration_chunk_th=" + i + "_shard_th=" + 0
        }
        create_document_and_record_rtt(
            databases, process.env.APPWRITE_DATABASE, COLLECTION_ID, data, i, 0
        )
            .then(result => { result_all_requests.push(result) })
            .catch(e => { return e })
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
}

const session_id = "test_session"

async function handle_master() {
    let COLLECTION_ID = await clear_appwrite()

    console.log(`++ Number of CPUs is ${totalCPUs}`);
    console.log(`++ Master ${process.pid} is running`);
    let current_task = 0
    let task_th_done = 0
    const MAX_NBR_TASK = 12
    const task_size = 500
    
    // Fork workers.
    let workers = []
    for (var i = 0; i < totalCPUs; i++) {
        let worker = cluster.fork();
        worker.on('message', function (msg) {
            if ("task_id" in msg) {
                console.log(msg.task_id, task_th_done++)
                let new_task_id = current_task++;
                if (new_task_id < MAX_NBR_TASK) {
                    console.log(`++ Master => ${msg.worker_id}: ok, new task_id=${new_task_id}`)
                    worker.send({
                        "COLLECTION_ID": COLLECTION_ID, "task_id": new_task_id, 
                        "task_size": task_size, "worker_id": msg.worker_id
                    })
                }
            }
        });
        workers.push(worker)
    }
    console.log(`++ Initiated ${totalCPUs} workers. Start assigning tasks ...`)
    
    for (let i=0; i<totalCPUs; i++) {
        // fs.createWriteStream(`log_client_${worker_id}_${session_id}.txt`); // clear old log files
        workers[i].send({"task_id": current_task++, "task_size": task_size})
    }
    
    while (true) {
        // console.log(task_th_done)
        if (task_th_done == MAX_NBR_TASK) {
            req_stop_collecting_stat(session_id)
            .then(r => {console.log("## Sent req_stop_collecting_stat")})
            .catch(e => { console.log({ error: e }) })
            break
        }
        await sleep_ms(100)
    }
}
if (cluster.isMaster) {

    handle_master()

} else {
    console.log(`-- Worker ${cluster.worker.id} started.`)
    process.on("message", (msg) => {
        // console.log(process.pid)
        if ("exit_now" in msg) {
            // Exit  
        } else if ("task_size" in msg) {
            // console.log(cluster.worker.id)
            request_worker(msg.COLLECTION_ID, session_id, cluster.worker.id, msg.task_size)
                .then(r => {
                    console.log(`-- Worker ${cluster.worker.id} done task_id=${msg.task_id}, task_size=${msg.task_size}`)
                    process.send({ worker_id: cluster.worker.id, task_id: msg.task_id, task_size: msg.task_size });
                })
        }
    })

}