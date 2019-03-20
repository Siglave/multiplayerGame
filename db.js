const MongoClient = require('mongodb').MongoClient;
const config = require('./config');



exports.getDB = (callback) => {
    // Connection URL
    const url = 'mongodb+srv://' + config.mongoUsername + ':' + config.mongoPassword + '@cluster0-gmdwq.mongodb.net/test?retryWrites=true';

    // Database Name
    const dbName = 'repulse';
    const client = new MongoClient(url, { useNewUrlParser: true });

    client.connect((err) => {
        if (err) {
            console.log(err);
        }
        console.log("Connected successfully to server");

        const db = client.db(dbName);
        callback(db, () => {
            client.close();
            console.log("Mongo closed");
        })
    });
}