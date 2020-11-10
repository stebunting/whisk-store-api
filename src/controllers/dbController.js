// Page Tag
const tag = 'store-api:db-control';

// Requirements
require('dotenv').config();
const { MongoClient, ObjectID } = require('mongodb');
const debug = require('debug')(tag);

const dbUrl = process.env.DB_URL;
let client;
let db;

function dbController(loggingTag, dbName = process.env.DB_NAME) {
  // Connect to MongoDB Database
  function connect() {
    return new Promise((resolve, reject) => {
      MongoClient.connect(dbUrl, { useUnifiedTopology: true })
        .then((data) => {
          client = data;
          db = client.db(dbName);
          debug('Connected to MongoDB');
          return resolve(db);
        })
        .catch((error) => {
          debug('Error connecting to MongoDB');
          return reject(error);
        });
    });
  }

  // Disconnect from MongoDB Database
  function disconnect() {
    if (client != null) {
      client.close();
      client = undefined;
      db = undefined;
      debug('Disconnected from MongoDB');
    }
  }

  // Return true or false if database is connected or not
  function isConnected() {
    if (client === undefined) {
      return false;
    }
    return client.isConnected();
  }

  // Return a Database Instance
  function getCursor(collection) {
    return db.collection(collection);
  }

  // Add New Product
  function addProduct(product) {
    return new Promise((resolve, reject) => {
      if (!isConnected()) {
        return reject(new Error('Not connected to database'));
      }
      return db.collection('products').insertOne(product)
        .then((data) => resolve(data))
        .catch((error) => reject(error));
    });
  }

  // Get Products from DB
  function getProducts(query = {}) {
    return new Promise((resolve, reject) => {
      if (!isConnected()) {
        return reject(new Error('Not connected to database'));
      }
      return db.collection('products').find(query).toArray()
        .then((data) => resolve(data))
        .catch((error) => reject(error));
    });
  }

  // Get Number of Products
  function numProducts() {
    return new Promise((resolve, reject) => {
      if (!isConnected()) {
        return reject(new Error('Not connected to database'));
      }
      return db.collection('products').countDocuments()
        .then((data) => resolve(data))
        .catch((error) => reject(error));
    });
  }

  return {
    connect,
    isConnected,
    disconnect,
    getCursor,
    addProduct,
    getProducts,
    numProducts
  };
}

module.exports = dbController;
