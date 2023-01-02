const { ID, Databases } = require('node-appwrite');
const http = require('http');

const crypto = require("crypto");

function sleep_ms(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 
 * @param {String} collect_start_url Server collection signal path, ie "http://192.168.1.32:8888/collect-stat"
 */
function request_collecting_stat(collect_start_url) {
    http.get(collect_start_url, (res) => {
        console.log('statusCode:', res.statusCode);
        console.log('headers:', res.headers);

        res.on('data', (d) => {
            // process.stdout.write(d);
        });

    }).on('error', (e) => {
        console.error(e);
    });
}


/**
 * The resulting string will be twice as long as the random bytes you generate; 
 * each byte encoded to hex is 2 characters. 20 bytes will be 40 characters of hex. 
 * https://stackoverflow.com/a/27747377
 * @param {String} length 
 * @returns {String} a string with length 2xlength
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
            console.log(error);
            return "";
        });
}


/**
 * 
 * @param {Databases} db_obj 
 * @param {String} database_id  
 * @param {String} collection_id 
 * @param {Object} data 
 * @param {int} request_id 
 * @returns {Promise<string>}
 */
function create_document_and_record_rtt(db_obj, database_id, collection_id, data, request_id) {
    let t0 = performance.now()
    let promise = db_obj.createDocument(
        database_id, collection_id, ID.unique(), data
    );
    return promise.then(
        function (response) {
            let t3 = performance.now()
            // return response["$id"];
            return {"request_id": request_id, "t0": t0, "t3": t3}
        },
        function (error) {
            // console.log({request_id: request_id, error: error})
            return {"request_id": request_id, "rtt": -9999};
        });
}


/**
 * 
 * @param {Databases} databases 
 * @param {String} database_id 
 * @param {String} collection_id 
 * @returns {Promise}
 */
function create_userdb_attributes(databases, database_id, collection_id) {
    console.log("Createing attributes for collection: " + collection_id)
    let p1 = databases.createStringAttribute(
        database_id, collection_id, "username", 255, true
    )
    let p2 = databases.createStringAttribute(
        database_id, collection_id, "password", 255, true
    )
    let p3 = databases.createStringAttribute(
        database_id, collection_id, "email", 255, true
    )
    let p4 = databases.createStringAttribute(
        database_id, collection_id, "profile", 255, true
    )
    let combined_promise = Promise.all([p1, p2, p3, p4]);
    return combined_promise;
}


/**
 * Same as Promise.all(items.map(item => task(item))), but it waits for
 * the first {batchSize} promises to finish before starting the next batch.
 * https://stackoverflow.com/a/64543086
 *
 * @template A
 * @template B
 * @param {function(A): B} task The task to run for each item.
 * @param {A[]} items Arguments to pass to the task for each call.
 * @param {int} batchSize
 * @returns {Promise<B[]>}
 */
async function promiseAllInBatches(task, items, batchSize) {
    let position = 0;
    let results = [];
    while (position < items.length) {
        const itemsForBatch = items.slice(position, position + batchSize);
        results = [...results, ...await Promise.all(itemsForBatch.map(item => task(item)))];
        position += batchSize;
    }
    return results;
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
 * @param {Databases} databases 
 * @param {String} database_id 
 * @param {String} collection_id 
 * @param {Object} data 
 * @returns {Promise<string>}
 */
function create_new_document_user(databases, database_id, collection_id, data) {
    let promise = databases.createDocument(
        database_id, collection_id, ID.unique(), data
    );

    return promise.then(
    function (response) {
        return response["$id"];
    }, 
    function (error) {
        console.log(error);
        return "";
    });
}



/**
 * 
 * @param { Databases } databases 
 * @param { String } database_id 
 * @returns {Promise<collections_response>}
 */
function delete_all_collections(databases, database_id) {
    const promise = databases.listCollections(database_id);

    promise.then(function (response) {
        response["collections"].forEach(col => {
            const promise_inner = databases.deleteCollection(database_id, col["$id"]);
            promise_inner.then(function (response_inner) {
                return response_inner
            }, function (error) {
                console.log(error);
            });
        })
    }, function (error) {
        console.log(error);
    });
}

module.exports = {
    rand_str, sleep_ms, request_collecting_stat,
    create_new_collection, delete_all_collections, 
    create_userdb_attributes, create_new_document_user,
    create_attr_for_collection, promiseAllInBatches,
    create_document_and_record_rtt
}