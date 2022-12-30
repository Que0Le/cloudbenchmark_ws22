const { Client, Users, ID, Databases } = require('node-appwrite');

const { 
    rand_str, sleep_ms,
    create_new_collection, delete_all_collections, 
    create_userdb_attributes, create_new_document_user 
} = require('./helpers');

const client = new Client();
client.setSelfSigned();

const databases = new Databases(client);
// databases.createStringAttribute('[DATABASE_ID]', '[COLLECTION_ID]', '', 1, false);
client
    .setEndpoint('https://localhost/v1') // Your API Endpoint
    .setProject('638d23c561bab05913aa') // Your project ID
    .setKey('d72529f1c65f7f066e35270e752ec7f769633fafd075462de200acc110aa76ee4edda6ff64b454830beed9b5e9743d0d090845090a491e7328cf5c00338477a99f59abe3f08869fcbb5a0379369730332ddd45770ae2290ee054bf91ebc8663236aa5542e816ab364ab5de5dae3ad76cac490b9e461350d1b412e4a38de2eb50')
;

// const users = new Users(client);

// let promise = users.create(
//     ID.unique(),
//     'email@example.com',
//     null,
//     'password'
// );

// promise.then(function (response) {
//     console.log(response);
// }, function (error) {
//     console.log(error);
// });

// let DATABASE_ID = "638e7d2d73a3e15dc541";
// let COLLECTION_ID = "";
// let DOCUMENT_ID = "";



/* Create collection */
// let promise = databases.createCollection(
//     DATABASE_ID, ID.unique(), new Date().toISOString().replace(":", "_")
// );

// promise.then(function (response) {
//     // console.log(response);
//     COLLECTION_ID = response["$id"]
//     console.log("#### created collection id=" + COLLECTION_ID);
// }, function (error) {
//     console.log(error);
// });


async function main() {
    let DATABASE_ID = "638e7d2d73a3e15dc541";
    await delete_all_collections(databases, DATABASE_ID);
    let COLLECTION_ID = "";
    let DOCUMENT_ID = "";
    COLLECTION_ID = await create_new_collection(databases, DATABASE_ID);
    console.log("## CREATED COLLECTION_ID=" + COLLECTION_ID);
    let temp = await create_userdb_attributes(databases, DATABASE_ID, COLLECTION_ID);
    console.log({temp: temp})
    await sleep_ms(1000)
    for (let i = 0; i < 20; i++) {
        create_new_document_user(
            databases, DATABASE_ID, COLLECTION_ID, {
                "password": "password" + "_" + i,
                "username": "username" + "_" + i,
                "email": "email" + "_" + i,
                "profile": "profile" + "_" + i,
            }
        )
    }
}

main()


/* Fill data */
// for (let i=0; i<2; i++) {
//     let data = {
//         username: "_username_" + rand_str(100),
//         password: "_password_" + rand_str(100),
//         status: "_status_" + rand_str(100),
//         bio: "_bio_"  + rand_str(100)
//     };
//     // console.log(data);

//     let promise = databases.createDocument(
//         DATABASE_ID, COLLECTION_ID, ID.unique(), data
//     );
    
//     promise.then(function (response) {
//         // console.log(response);
//     }, function (error) {
//         console.log(error);
//     });
// }


