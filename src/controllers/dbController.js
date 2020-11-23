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
  baskets: 'storeBaskets',
  orders: 'storeOrders'
};

function test(testing = false) {
  if (testing) {
    collections.products = '__test_storeProducts';
    collections.baskets = '__test_storeBaskets';
    collections.orders = '__test_storeOrders';
  } else {
    collections.products = 'storeProducts';
    collections.baskets = 'storeBaskets';
    collections.orders = 'storeOrders';
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
function count(collection) {
  return new Promise((resolve, reject) => {
    if (!isConnected()) {
      return reject(new Error('Not connected to database'));
    }
    return db.collection(collections[collection]).countDocuments()
      .then((data) => resolve(data))
      .catch((error) => reject(error));
  });
}

// Create New Basket
function addBasket() {
  const newBasket = {
    items: [],
    delivery: {
      zone: -1,
      address: ''
    }
  };
  return new Promise((resolve, reject) => {
    if (!isConnected()) {
      return reject(new Error('Not connected to database'));
    }
    return db.collection(collections.baskets).insertOne(newBasket)
      .then((data) => resolve(data))
      .catch((error) => reject(error));
  });
}

// Update Quantity of Item in Basket
function updateBasketById(basketId, payload) {
  return new Promise((resolve, reject) => {
    if (!isConnected()) {
      return reject(new Error('Not connected to database'));
    }
    return db.collection(collections.baskets).updateOne(
      { _id: ObjectId(basketId) },
      {
        $pull: {
          items: {
            productId: payload.productId,
            deliveryType: payload.deliveryType,
            deliveryDate: payload.deliveryDate
          }
        }
      },
      { multi: true }
    ).then(() => db.collection(collections.baskets).updateOne(
      { _id: ObjectId(basketId) },
      { $push: { items: payload } }
    )).then((data) => resolve(data))
      .catch((error) => reject(error));
  });
}

// Update Basket Zone
function updateBasketZone(basketId, location) {
  return new Promise((resolve, reject) => {
    if (!isConnected()) {
      return reject(new Error('Not connected to database'));
    }
    return db.collection(collections.baskets).updateOne(
      { _id: ObjectId(basketId) },
      { $set: { delivery: location } }
    ).then((data) => resolve(data))
      .catch((error) => reject(error));
  });
}

// Remove Item From Basket
function removeItemFromBasket(basketId, productId) {
  return new Promise((resolve, reject) => {
    if (!isConnected()) {
      return reject(new Error('Not connected to database'));
    }
    return db.collection(collections.baskets).updateOne(
      { _id: ObjectId(basketId) },
      { $unset: { [`items.${productId}`]: 1 } }
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

// Get Basket from DB
function removeBasketById(id) {
  return new Promise((resolve, reject) => {
    if (!isConnected()) {
      return reject(new Error('Not connected to database'));
    }
    return db.collection(collections.baskets).deleteOne({
      _id: ObjectId(id)
    }).then((data) => resolve(data))
      .catch((error) => reject(error));
  });
}

// Create New Order
function addOrder(order) {
  return new Promise((resolve, reject) => {
    if (!isConnected()) {
      return reject(new Error('Not connected to database'));
    }
    return db.collection(collections.orders).insertOne(order)
      .then((data) => resolve(data))
      .catch((error) => reject(error));
  });
}

// Update an order
function updateOrder(orderId, query) {
  return new Promise((resolve, reject) => {
    if (!isConnected()) {
      return reject(new Error('Not connected to database'));
    }
    return db.collection(collections.orders).updateOne(
      { _id: ObjectId(orderId) },
      { $set: query }
    )
      .then((data) => resolve(data))
      .catch((error) => reject(error));
  });
}

// Get Order from DB
function getOrderById(id) {
  return new Promise((resolve, reject) => {
    if (!isConnected()) {
      return reject(new Error('Not connected to database'));
    }
    return db.collection(collections.orders).find({
      _id: ObjectId(id)
    }).toArray()
      .then((data) => resolve(data))
      .catch((error) => reject(error));
  });
}

// Check Swish Status
function getSwishStatus(swishId) {
  return new Promise((resolve, reject) => {
    if (!isConnected()) {
      return reject(new Error('Not connected to database'));
    }
    return db.collection(collections.orders).find(
      { 'payment.swish.id': swishId }
    ).toArray()
      .then((data) => resolve(data.map((payment) => payment.payment.swish)))
      .catch((error) => reject(error));
  });
}

// Update payment details
function updateSwishPayment(payment) {
  return new Promise((resolve, reject) => {
    if (!isConnected()) {
      return reject(new Error('Not connected to database'));
    }
    return db.collection(collections.orders).updateOne(
      { 'payment.swish.id': payment.id },
      { $set: { 'payment.swish': payment } }
    ).then((data) => resolve(data))
      .catch((error) => reject(error));
  });
}

module.exports = {
  test,
  connect,
  isConnected,
  disconnect,
  getCursor,
  count,
  addProduct,
  getProducts,
  getProductById,
  addBasket,
  updateBasketById,
  updateBasketZone,
  removeItemFromBasket,
  getBasketById,
  removeBasketById,
  addOrder,
  updateOrder,
  getOrderById,
  getSwishStatus,
  updateSwishPayment
};
