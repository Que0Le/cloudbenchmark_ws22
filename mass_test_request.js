const { Client, Users, ID, Databases } = require('node-appwrite');
const fs = require('fs');

require('dotenv').config();

let SERVER_ADDR  = process.env.SERVER_ADDR

const { 
    rand_str, sleep_ms, write_array_of_results_to_file,
    req_start_collecting_stat, req_stop_collecting_stat,
    create_new_collection, delete_all_collections, 
    create_userdb_attributes, create_new_document_user,
    create_attr_for_collection, promiseAllInBatches,
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


let DATABASE_ID = "638e7d2d73a3e15dc541";
async function main() {
    console.time("main")
    await delete_all_collections(databases, DATABASE_ID);
    let COLLECTION_ID = "";
    let DOCUMENT_ID = "";
    COLLECTION_ID = await create_new_collection(databases, DATABASE_ID);
    console.log("## CREATED COLLECTION_ID=" + COLLECTION_ID);
    let temp = await create_userdb_attributes(databases, DATABASE_ID, COLLECTION_ID);
    // console.log({temp: temp})
    await sleep_ms(1000)
    let created_promisses = []
    for (let i = 0; i < 5000; i++) {
        created_promisses.push(create_new_document_user(
            databases, DATABASE_ID, COLLECTION_ID, {
                "password": "password" + "_" + i,
                "username": "username" + "_" + i,
                "email": "email" + "_" + i,
                "profile": "profile" + "_" + i,
            }
        ))
    }
    Promise.all(created_promisses).then((result) => {
        console.timeEnd("main")
    })
}


// main()

/**
 * 
 * @param {String} session_id 
 */
async function test_create_collection_10k_doc(session_id) {
    
    await delete_all_collections(databases, DATABASE_ID);
    let COLLECTION_ID = await create_new_collection(databases, DATABASE_ID);
    console.log("## CREATED COLLECTION_ID=" + COLLECTION_ID);

    let max_attr = 10
    attrs = []
    for (let i=0; i<max_attr; i++) {
        attrs.push({"attr_key": "key_" + i, "attr_size": 255, "attr_required": true})
    }
    let created_attrs = await create_attr_for_collection(databases, DATABASE_ID, COLLECTION_ID, attrs)
    console.log("## CREATED attrs: " + created_attrs)

    // Inform test server to start collecting system status
    let res_start = await req_start_collecting_stat(session_id).catch(e => { console.log({error: e}) })
    console.log("## Sent req_start_collecting_stat")
    console.log(res_start)

    await sleep_ms(2000)

    let max_chunk = 5
    let max_shard = 30

    let result_all_requests = []

    let chunk_promises = []
    for (let chunk_th = 0; chunk_th < max_chunk; chunk_th++) {
        console.log("-- Adding chunk_th=" + chunk_th)
        let t0 = performance.now()

        let chunk_prom = new Promise((resolve, reject) => {
            let shard_promises = []
            for (let shard_th = 0; shard_th < max_shard; shard_th++) {
                data = {}
                for (let j = max_attr - 1; j >= 0; j--) {
                    data["key_" + j] = "iteration_chunk_th=" + chunk_th + "_shard_th=" + shard_th
                }
                shard_promises.push(create_document_and_record_rtt(
                    databases, DATABASE_ID, COLLECTION_ID, data, chunk_th, shard_th
                ))
            }
            Promise.all(shard_promises).then((result) => {
                // console.log(result)
                let t1 = performance.now()
                console.log("++ Chunk completed after " + (t1-t0) + "ms: chunk_th=" + chunk_th)
                result_all_requests.push(result)
                resolve()
            })
        })
        chunk_promises.push(chunk_prom)
    }
    await Promise.all(chunk_promises).then((result) => {
        console.log("## All chunks resolved")
        req_stop_collecting_stat("TEST_STAT")
            .catch(e => { console.log({ error: e }) })
        console.log("## Sent req_stop_collecting_stat")
    })
    let filename = "log_client_" + session_id + ".txt"
    await write_array_of_results_to_file(result_all_requests, filename)
        .catch(e => { console.log({ error: e }) })
    console.log("## Done writing data to file filename=" + filename)
    

}
test_create_collection_10k_doc("test_session")



