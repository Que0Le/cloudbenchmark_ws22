const { ID, Databases } = require('node-appwrite');
const http = require('http');
const crypto = require("crypto");
const fs = require('fs');

require('dotenv').config();

function sleep_ms(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


/**
 * 
 * @param {Array<Array<Object>>} array_data 
 * @param {String} filepath 
 * @returns 
 */
function write_array_of_results_to_file(array_data, filepath) {
    const writeStream = fs.createWriteStream(filepath);
    let errors = []
    return new Promise((resolve, reject) => {
        array_data.forEach(ad => {
            ad.forEach(result => {
                writeStream.write(`${JSON.stringify(result)}\n`)
            })
        })

        // the finish event is emitted when all data has been flushed from the stream
        writeStream.on('finish', () => {
           resolve()
        });
        
        // handle the errors on the write process
        writeStream.on('error', (err) => {
            errors.push(err)
        });
        
        // close the stream
        writeStream.end();
        if (errors.length != 0) {
            reject(errors)
        }
    })     
}


/**
 * 
 * @param {String} session_name Session name to to name the log file
 * @returns {Promise} message body
 */
function req_start_collecting_stat(session_name) {
    let url_start =
        "http://" + process.env.SERVER_ADDR + ":" + process.env.SERVER_PORT +
        process.env.SERVER_START_COLLECTING_ADDR + "/?session_name=" + session_name
    // console.log(url_start)
    return new Promise((resolve, reject) => {
        http.get(url_start, (res) => {
            // console.log('statusCode:', res.statusCode);
            let body = ''; 
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                // process.stdout.write(d);
                if (res.statusCode != 201) {
                    reject(body)
                }
                // console.log(JSON.parse(body))
                resolve(JSON.parse(body))
            });

        }).on('error', (e) => {
            console.error(e);
            reject(body)
        });
    })
}


/**
 * 
 * @param {String} session_name Session name to to name the log file
 * @returns {Promise} message body
 */
function req_stop_collecting_stat(session_name) {
    let url_stop =
        "http://" + process.env.SERVER_ADDR + ":" + process.env.SERVER_PORT +
        process.env.SERVER_STOP_COLLECTING_ADDR //+ "/?session_name=" + session_name
    // console.log(url_stop)
    return new Promise((resolve, reject) => {
        http.get(url_stop, (res) => {
            // console.log('statusCode:', res.statusCode);
            let body = ''; 
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                // process.stdout.write(d);
                if (res.statusCode != 202) {
                    reject(body)
                }
                // console.log(JSON.parse(body))
                resolve(JSON.parse(body))
            });

        }).on('error', (e) => {
            console.error(e);
            reject(body)
        });
    })
}


/**
 * The resulting string will be twice as long as the random bytes you generate; 
 * each byte encoded to hex is 2 characters. 20 bytes will be 40 characters of hex. 
 * https://stackoverflow.com/a/27747377
 * @param {String} length 
 * @returns {String} a string with len = 2 x _**length**_
 */
function rand_str(length) {
    return crypto.randomBytes(length).toString('hex');
}


/**
 * 
 * @param {Databases} db_obj 
 * @param {String} database_id 
 * @returns {Promise<string>}
 */
function create_new_collection(db_obj, database_id) {
    let promise = db_obj.createCollection(
        database_id, ID.unique(), new Date().toISOString().replace(":", "_")
    )
    return promise.then(
        function (response) {
            return response["$id"];
        },
        function (error) {
            return e
        });
}


/**
 * 
 * @param {Databases} db_obj 
 * @param {String} database_id  
 * @param {String} collection_id 
 * @param {Object} data 
 * @param {int} chunk_th 
 * @param {int} shard_th 
 * @returns {Promise<string>}
 */
function create_document_and_record_rtt(db_obj, database_id, collection_id, data, chunk_th, shard_th) {
    let t0 = performance.now()
    let promise = db_obj.createDocument(
        database_id, collection_id, ID.unique(), data
    );
    return promise.then(
        function (response) {
            let t3 = performance.now()
            // return response["$id"];
            // console.log({"chunk_th": chunk_th, "shard_th": shard_th, "t0": t0, "t3": t3})
            return {"chunk_th": chunk_th, "shard_th": shard_th, "t0": t0, "t3": t3}
        },
        function (error) {
            // console.log({request_id: request_id, error: error})
            return {"chunk_th": chunk_th, "shard_th": shard_th, "t0": t0, "t3": -999, "error": error}
        });
}


/**
 * 
 * @param {Databases} db_obj 
 * @param {String} database_id 
 * @param {String} collection_id 
 * @param {[Object]} attrs 
 * @returns {Promise}
 */
function create_attr_for_collection(db_obj, database_id, collection_id, attrs) {
    let promisses = []
    attrs.forEach(attr => {
        promisses.push(db_obj.createStringAttribute(
            database_id, collection_id, attr["attr_key"], attr["attr_size"], attr["attr_required"]
        ))
    })
    return Promise.all(promisses);
}


/**
 * 
 * @param { Databases } databases 
 * @param { String } database_id 
 * @returns {Promise<collections_response>}
 */
function delete_all_collections(databases, database_id) {
    const promise = databases.listCollections(database_id);

    return promise.then(function (response) {
        response["collections"].forEach(col => {
            const promise_inner = databases.deleteCollection(database_id, col["$id"]);
            promise_inner.then(function (response_inner) {
                return response_inner
            }, function (error) {
                return error;
            });
        })
    }, function (error) {
        return error;
    });
}

module.exports = {
    rand_str, sleep_ms, write_array_of_results_to_file,
    req_start_collecting_stat, req_stop_collecting_stat,
    create_new_collection, delete_all_collections, 
    create_attr_for_collection,
    create_document_and_record_rtt
}