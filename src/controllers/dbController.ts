// Requirements
import {
  Collection,
  Db,
  DeleteWriteOpResultObject,
  InsertOneWriteOpResult,
  MongoClient,
  ObjectId,
  UpdateWriteOpResult
} from 'mongodb';
import log from 'winston';
import Debug from 'debug';
import dotenv from 'dotenv';

// Types
import { Product } from '../types/Product';
import { Order } from '../types/Order';
import { DbBasket } from '../types/Basket';
import { SwishPayload } from '../types/SwishPayload';
import { SwishRefundPayload } from '../types/SwishRefundPayload';
import { User } from '../types/User';

// Page Tag
const tag = 'store-api:db-control';
const debug = Debug(tag);
dotenv.config();

// Types
interface UpdateBasketPayload {
  productSlug: string
  quantity?: number,
  deliveryType: string,
  deliveryDate: string,
}

interface UpdateBasketLocation {
  address: string,
  zone: number
}

interface IdType {
  _id: ObjectId
}

const dbUrl = process.env.DB_URL || '';
const dbName = process.env.DB_NAME || '';
let client: MongoClient;
let db: Db;
const collections: { [key: string]: string } = {
  products: 'products',
  baskets: 'baskets',
  orders: 'orders',
  admin: 'admin'
};

function test(testing = false): void {
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
function connect(): Promise<Db> {
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
function disconnect(): void {
  if (client != null) {
    client.close();
    // client = undefined;
    // db = undefined;
    log.info('Disconnected from MongoDB', { metadata: { tag } });
  }
}

// Return true or false if database is connected or not
function isConnected(): boolean {
  if (client === undefined) return false;
  return client.isConnected();
}

// Return a Database Instance
function getCursor(collection: string): Collection {
  return db.collection(collections[collection]);
}

// Set up DB
function setUpDB(): Promise<string> {
  return new Promise((resolve, reject) => (
    db.collection(collections.orders).createIndex(
      { 'payment.swish.id': 1 },
      { unique: true, sparse: true }
    ).then(() => db.collection(collections.orders).createIndex(
      { 'payment.refunds.id': 1 },
      { unique: true, sparse: true }
    )).then(() => db.collection(collections.products).createIndex(
      { slug: 1 },
      { unique: true }
    ))
      .then((data) => resolve(data))
      .catch((error) => reject(error))
  ));
}

// Add New Product
function addProduct(product: Product): Promise<InsertOneWriteOpResult<Product>> {
  return new Promise((resolve, reject) => (
    db.collection(collections.products).insertOne(product)
      .then((data) => resolve(data))
      .catch((error) => reject(error))
  ));
}

// Get Products from DB
function getProducts(query: {[key: string]: any } = { available: true }): Promise<Array<Product>> {
  return new Promise((resolve, reject) => (
    db.collection(collections.products).find(query).toArray()
      .then((data) => resolve(data))
      .catch((error) => reject(error))
  ));
}

// Get Products from DB
function getProductById(id: string): Promise<Array<Product>> {
  return getProducts({ _id: new ObjectId(id) });
}
function getProductBySlug(slug: string): Promise<Array<Product>> {
  return getProducts({ slug });
}

// Get Number of Products
function count(collection: string): Promise<number> {
  return new Promise((resolve, reject) => (
    db.collection(collections[collection]).countDocuments()
      .then((data) => resolve(data))
      .catch((error) => reject(error))
  ));
}

// Create New Basket
function addBasket(): Promise<InsertOneWriteOpResult<DbBasket>> {
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
function updateBasketById(
  basketId: string, payload: UpdateBasketPayload
): Promise<UpdateWriteOpResult> {
  return new Promise((resolve, reject) => (
    db.collection(collections.baskets).updateOne(
      { _id: new ObjectId(basketId) },
      { $push: { items: payload } }
    ).then((data) => resolve(data))
      .catch((error) => reject(error))
  ));
}

// Update Basket Zone
function updateBasketZone(
  basketId: string, location: UpdateBasketLocation
): Promise<UpdateWriteOpResult> {
  return new Promise((resolve, reject) => (
    db.collection(collections.baskets).updateOne(
      { _id: new ObjectId(basketId) },
      { $set: { delivery: location } }
    ).then((data) => resolve(data))
      .catch((error) => reject(error))
  ));
}

// Remove Item From Basket
function removeItemFromBasket(
  basketId: string, payload: UpdateBasketPayload
): Promise<UpdateWriteOpResult> {
  return new Promise((resolve, reject) => (
    db.collection(collections.baskets).updateOne(
      { _id: new ObjectId(basketId) },
      {
        $pull: {
          items: {
            productSlug: payload.productSlug,
            deliveryType: payload.deliveryType,
            deliveryDate: payload.deliveryDate
          }
        }
      }
    ).then((data) => resolve(data))
      .catch((error) => reject(error))
  ));
}

// Get Basket from DB
function getBasketById(id: string): Promise<Array<DbBasket>> {
  return new Promise((resolve, reject) => (
    db.collection(collections.baskets).find({
      _id: new ObjectId(id)
    }).toArray()
      .then((data) => resolve(data))
      .catch((error) => reject(error))
  ));
}

// Get Basket from DB
function removeBasketById(id: string): Promise<DeleteWriteOpResultObject> {
  return new Promise((resolve, reject) => (
    db.collection(collections.baskets).deleteOne({
      _id: new ObjectId(id)
    }).then((data) => resolve(data))
      .catch((error) => reject(error))
  ));
}

// Remove old baskets
function cleanupBaskets(days: number): Promise<DeleteWriteOpResultObject> {
  return new Promise((resolve, reject) => {
    const milliseconds = days * 24 * 60 * 60 * 1000;
    const maxId = Math.floor((new Date().getTime() - milliseconds) / 1000).toString(16).padEnd(24, '0');

    return db.collection(collections.baskets).deleteMany({
      _id: { $lt: new ObjectId(maxId) }
    }).then((data) => resolve(data))
      .catch((error) => reject(error));
  });
}

// Create New Order
function addOrder(order: Order): Promise<InsertOneWriteOpResult<Order & IdType>> {
  return new Promise((resolve, reject) => (
    db.collection(collections.orders).insertOne(order)
      .then((data) => resolve(data))
      .catch((error) => reject(error))
  ));
}

// Update an order
interface UpdateOrderQuery {
  [operator: string]: {
    [key: string]: any
  }
}
function updateOrder(orderId: string, query: UpdateOrderQuery): Promise<UpdateWriteOpResult> {
  return new Promise((resolve, reject) => (
    db.collection(collections.orders).updateOne(
      { _id: new ObjectId(orderId) },
      query
    )
      .then((data) => resolve(data))
      .catch((error) => reject(error))
  ));
}

// Remove an order
function removeOrder(orderId: string): Promise<DeleteWriteOpResultObject> {
  return new Promise((resolve, reject) => (
    db.collection(collections.orders).deleteOne({
      _id: new ObjectId(orderId)
    }).then((data) => resolve(data))
      .catch((error) => reject(error))
  ));
}

// Get Order from DB
function getAllOrders(query = {}): Promise<Array<Order>> {
  return new Promise((resolve, reject) => (
    db.collection(collections.orders).find(query).sort({ _id: -1 }).toArray()
      .then((data) => resolve(data))
      .catch((error) => reject(error))
  ));
}
function getOrderById(id: string): Promise<Array<Order>> {
  return getAllOrders({ _id: new ObjectId(id) });
}

// Check Swish Status
function getSwishStatus(swishId: string): Promise<Array<SwishPayload>> {
  return new Promise((resolve, reject) => (
    db.collection(collections.orders).find(
      { 'payment.swish.id': swishId }
    ).toArray()
      .then((data) => resolve(data.map((payment) => payment.payment.swish)))
      .catch((error) => reject(error))
  ));
}

// Update payment details
function updateSwishPayment(payment: SwishPayload): Promise<UpdateWriteOpResult> {
  return new Promise((resolve, reject) => (
    db.collection(collections.orders).updateOne(
      { 'payment.swish.id': payment.id },
      { $set: { 'payment.swish': payment } }
    ).then((data) => resolve(data))
      .catch((error) => reject(error))
  ));
}

function updateSwishRefund(refund: SwishRefundPayload): Promise<UpdateWriteOpResult> {
  return new Promise((resolve, reject) => {
    db.collection(collections.orders).updateOne(
      { 'payment.refunds.id': refund.id },
      { $set: { 'payment.refunds.$': refund } }
    ).then((data) => resolve(data))
      .catch((error) => reject(error));
  });
}

// Get Admin User from DB
function getAdminUser(username: string): Promise<Array<User>> {
  return new Promise((resolve, reject) => (
    db.collection(collections.admin).find(
      { username }
    ).toArray()
      .then((data) => resolve(data))
      .catch((error) => reject(error))
  ));
}

export {
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
  removeOrder,
  getAllOrders,
  getOrderById,
  getSwishStatus,
  updateSwishPayment,
  updateSwishRefund,
  getAdminUser,
  UpdateBasketPayload,
  UpdateBasketLocation
};
