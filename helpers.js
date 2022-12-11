const { ID } = require('node-appwrite');

const crypto = require("crypto");


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
 * @param {Appwrite_Databases} databases 
 * @param {String} database_id 
 * @returns {Promise<string>} COLLECTION_ID
 */
function create_new_collection(databases, database_id) {
    let promise = databases.createCollection(
        database_id, ID.unique(), new Date().toISOString().replace(":", "_")
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
 * @param { Appwrite_Databases } databases 
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
    rand_str, 
    create_new_collection, delete_all_collections
}