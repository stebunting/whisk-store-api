// Page Tag
const tag = 'store-api:db-control';

// Requirements
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const debug = require('debug')(tag);

const dbUrl = process.env.DB_URL;
const dbName = process.env.DB_NAME;
let client;
let db;
const collections = {
  products: 'storeProducts',
  baskets: 'storeBaskets'
};

function dbController() {
  function test(testing = false) {
    if (testing) {
      collections.products = '__test_storeProducts';
      collections.baskets = '__test_storeBaskets';
    } else {
      collections.products = 'storeProducts';
      collections.baskets = 'storeBaskets';
    }
  }

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
    return db.collection(collections[collection]);
  }

  // Add New Product
  function addProduct(product) {
    return new Promise((resolve, reject) => {
      if (!isConnected()) {
        return reject(new Error('Not connected to database'));
      }
      return db.collection(collections.products).insertOne(product)
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
      return db.collection(collections.products).find(query).toArray()
        .then((data) => resolve(data))
        .catch((error) => reject(error));
    });
  }

  // Get Products from DB
  function getProductById(id) {
    return getProducts({ _id: ObjectId(id) });
  }

  // Get Number of Products
  function numProducts() {
    return new Promise((resolve, reject) => {
      if (!isConnected()) {
        return reject(new Error('Not connected to database'));
      }
      return db.collection(collections.products).countDocuments()
        .then((data) => resolve(data))
        .catch((error) => reject(error));
    });
  }

  // Create New Basket
  function addBasket() {
    return new Promise((resolve, reject) => {
      if (!isConnected()) {
        return reject(new Error('Not connected to database'));
      }
      return db.collection(collections.baskets).insertOne({ items: {} })
        .then((data) => resolve(data))
        .catch((error) => reject(error));
    });
  }

  // Update Basket
  function updateBasketById(id, productId, quantity) {
    return new Promise((resolve, reject) => {
      if (!isConnected()) {
        return reject(new Error('Not connected to database'));
      }
      return db.collection(collections.baskets).updateOne(
        { _id: ObjectId(id) },
        { $inc: { [`items.${productId}`]: quantity } }
      ).then((data) => resolve(data))
        .catch((error) => reject(error));
    });
  }

  // Get Basket from DB
  function getBasketById(id) {
    return new Promise((resolve, reject) => {
      if (!isConnected()) {
        return reject(new Error('Not connected to database'));
      }
      return db.collection(collections.baskets).find({
        _id: ObjectId(id)
      }).toArray()
        .then((data) => resolve(data))
        .catch((error) => reject(error));
    });
  }

  return {
    test,
    connect,
    isConnected,
    disconnect,
    getCursor,
    addProduct,
    getProducts,
    getProductById,
    numProducts,
    addBasket,
    updateBasketById,
    getBasketById
  };
}

module.exports = dbController;
