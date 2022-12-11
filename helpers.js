
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
 * @returns {String} COLLECTION_ID
 */
function create_new_collection(databases) {
    let promise = databases.createCollection(
        DATABASE_ID, ID.unique(), new Date().toISOString().replace(":", "_")
    );
    
    promise.then(function (response) {
        // console.log(response);
        // console.log("#### created collection id=" + COLLECTION_ID);
    }, function (error) {
        console.log(error);
    });

    return response["$id"]
}

module.exports = {
    rand_str, 
    create_new_collection
}