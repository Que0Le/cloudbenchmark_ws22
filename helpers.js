const { ID, Databases } = require('node-appwrite');

const crypto = require("crypto");

function sleep_ms(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 
 * @param {String} length 
 * @returns {String} a string with length 2xlength
 */
function rand_str(length) {
    /* The resulting string will be twice as long as the random bytes you generate; 
    each byte encoded to hex is 2 characters. 
    20 bytes will be 40 characters of hex. 
    https://stackoverflow.com/a/27747377
    */
    return crypto.randomBytes(length).toString('hex');
}

/**
 * 
 * @param {Databases} databases 
 * @param {String} database_id 
 * @returns {Promise<string>}
 */
function create_new_collection(databases, database_id) {
    let promise = databases.createCollection(
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
    rand_str, sleep_ms, 
    create_new_collection, delete_all_collections, 
    create_userdb_attributes, create_new_document_user
}