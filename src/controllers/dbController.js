// Page Tag
const tag = 'store-api:db-control';

// Requirements
require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const debug = require('debug')(tag);
const log = require('winston');

const dbUrl = process.env.DB_URL;
const dbName = process.env.DB_NAME;
let client;
let db;
const collections = {
  products: 'products',
  baskets: 'baskets',
  orders: 'orders',
  admin: 'admin'
};

function test(testing = false) {
  if (testing) {
    collections.products = '__test_products';
    collections.baskets = '__test_baskets';
    collections.orders = '__test_orders';
    collections.admin = '__test_admin';
  } else {
    collections.products = 'products';
    collections.baskets = 'baskets';
    collections.orders = 'orders';
    collections.admin = 'admin';
  }
}

// Connect to MongoDB Database
function connect() {
  return new Promise((resolve, reject) => {
    MongoClient.connect(dbUrl, { useUnifiedTopology: true })
      .then((data) => {
        client = data;
        db = client.db(dbName);
        log.info('Connected to MongoDB', { metadata: { tag } });
        return resolve(db);
      })
      .catch((error) => {
        log.error('Error connecting to MongoDB', { metadata: { tag, error } });
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
    log.info('Disconnected from MongoDB', { metadata: { tag } });
  }
}

// Return true or false if database is connected or not
function isConnected() {
  if (client === undefined) return false;
  return client.isConnected();
}

// Return a Database Instance
function getCursor(collection) {
  return db.collection(collections[collection]);
}

// Set up DB
function setUpDB() {
  return new Promise((resolve, reject) => (
    db.collection(collections.orders).createIndex(
      { 'swish.id': 1 },
      { sparse: true }
    ).then(() => db.collection(collections.products).createIndex(
      { slug: 1 },
      { unique: true }
    )).then((data) => resolve(data))
      .catch((error) => reject(error))
  ));
}

// Add New Product
function addProduct(product) {
  return new Promise((resolve, reject) => (
    db.collection(collections.products).insertOne(product)
      .then((data) => resolve(data))
      .catch((error) => reject(error))
  ));
}

// Get Products from DB
function getProducts(query = {}) {
  return new Promise((resolve, reject) => (
    db.collection(collections.products).find({
      ...query,
      available: true
    }).toArray()
      .then((data) => resolve(data))
      .catch((error) => reject(error))
  ));
}

// Get Products from DB
function getProductById(id) {
  return getProducts({ _id: ObjectId(id) });
}
function getProductBySlug(slug) {
  return getProducts({ slug });
}

// Get Number of Products
function count(collection) {
  return new Promise((resolve, reject) => (
    db.collection(collections[collection]).countDocuments()
      .then((data) => resolve(data))
      .catch((error) => reject(error))
  ));
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
  return new Promise((resolve, reject) => (
    db.collection(collections.baskets).insertOne(newBasket)
      .then((data) => resolve(data))
      .catch((error) => reject(error))
  ));
}

// Update Quantity of Item in Basket
function updateBasketById(basketId, payload) {
  return new Promise((resolve, reject) => (
    db.collection(collections.baskets).updateOne(
      { _id: ObjectId(basketId) },
      { $push: { items: payload } }
    ).then((data) => resolve(data))
      .catch((error) => reject(error))
  ));
}

// Update Basket Zone
function updateBasketZone(basketId, location) {
  return new Promise((resolve, reject) => (
    db.collection(collections.baskets).updateOne(
      { _id: ObjectId(basketId) },
      { $set: { delivery: location } }
    ).then((data) => resolve(data))
      .catch((error) => reject(error))
  ));
}

// Remove Item From Basket
function removeItemFromBasket(basketId, payload) {
  return new Promise((resolve, reject) => (
    db.collection(collections.baskets).updateOne(
      { _id: ObjectId(basketId) },
      {
        $pull: {
          items: {
            productSlug: payload.productSlug,
            deliveryType: payload.deliveryType,
            deliveryDate: payload.deliveryDate
          }
        }
      },
      { multi: true }
    ).then((data) => resolve(data))
      .catch((error) => reject(error))
  ));
}

// Get Basket from DB
function getBasketById(id) {
  return new Promise((resolve, reject) => (
    db.collection(collections.baskets).find({
      _id: ObjectId(id)
    }).toArray()
      .then((data) => resolve(data))
      .catch((error) => reject(error))
  ));
}

// Get Basket from DB
function removeBasketById(id) {
  return new Promise((resolve, reject) => (
    db.collection(collections.baskets).deleteOne({
      _id: ObjectId(id)
    }).then((data) => resolve(data))
      .catch((error) => reject(error))
  ));
}

// Remove old baskets
function cleanupBaskets(days) {
  return new Promise((resolve, reject) => {
    const milliseconds = days * 24 * 60 * 60 * 1000;
    const maxId = Math.floor((new Date() - milliseconds) / 1000).toString(16).padEnd(24, '0');

    return db.collection(collections.baskets).deleteMany({
      _id: { $lt: ObjectId(maxId) }
    }).then((data) => resolve(data))
      .catch((error) => reject(error));
  });
}

// Create New Order
function addOrder(order) {
  return new Promise((resolve, reject) => (
    db.collection(collections.orders).insertOne(order)
      .then((data) => resolve(data))
      .catch((error) => reject(error))
  ));
}

// Update an order
function updateOrder(orderId, query) {
  return new Promise((resolve, reject) => (
    db.collection(collections.orders).updateOne(
      { _id: ObjectId(orderId) },
      { $set: query }
    )
      .then((data) => resolve(data))
      .catch((error) => reject(error))
  ));
}

// Get Order from DB
function getAllOrders(query = {}) {
  return new Promise((resolve, reject) => (
    db.collection(collections.orders).find(query).sort({ _id: -1 }).toArray()
      .then((data) => resolve(data))
      .catch((error) => reject(error))
  ));
}

function getOrderById(id) {
  return getAllOrders({ _id: ObjectId(id) });
}

// Check Swish Status
function getSwishStatus(swishId) {
  return new Promise((resolve, reject) => (
    db.collection(collections.orders).find(
      { 'payment.swish.id': swishId }
    ).toArray()
      .then((data) => resolve(data.map((payment) => payment.payment.swish)))
      .catch((error) => reject(error))
  ));
}

// Update payment details
function updateSwishPayment(payment) {
  return new Promise((resolve, reject) => (
    db.collection(collections.orders).updateOne(
      { 'payment.swish.id': payment.id },
      { $set: { 'payment.swish': payment } }
    ).then((data) => resolve(data))
      .catch((error) => reject(error))
  ));
}

// Get Admin User from DB
function getAdminUser(username) {
  return new Promise((resolve, reject) => (
    db.collection(collections.admin).find(
      { username }
    ).toArray()
      .then((data) => resolve(data))
      .catch((error) => reject(error))
  ));
}

module.exports = {
  test,
  connect,
  isConnected,
  disconnect,
  getCursor,
  setUpDB,
  count,
  addProduct,
  getProducts,
  getProductById,
  getProductBySlug,
  addBasket,
  updateBasketById,
  updateBasketZone,
  removeItemFromBasket,
  getBasketById,
  removeBasketById,
  cleanupBaskets,
  addOrder,
  updateOrder,
  getAllOrders,
  getOrderById,
  getSwishStatus,
  updateSwishPayment,
  getAdminUser
};
