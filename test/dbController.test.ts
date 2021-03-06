// Requirements
import assert from 'assert';
import { ObjectId } from 'mongodb';

// Controllers
import {
  connect,
  test,
  isConnected,
  getCursor,
  setUpDB,
  disconnect,
  addProduct,
  getProducts,
  getProductById,
  count,
  addBasket,
  updateBasketById,
  removeItemFromBasket,
  getBasketById,
  removeBasketById,
  addOrder,
  getOrderById,
  getSwishStatus,
  updateSwishPayment,
  updateOrder,
  cleanupBaskets,
  removeOrder
} from '../src/controllers/dbController';

// Types
// import { Basket } from '../src/types/Basket';
import { Order } from '../src/types/Order';
import { Product } from '../src/types/Product';
import { SwishPayload } from '../src/types/SwishPayload';

// Data
const testData = require('./testData.json');

// interface TestData {
//   products: Array<Product>,
//   baskets: Array<Basket>,
//   orders: Array<Order>,
//   swishPayments: Array<SwishPayload>
// }
// const testData = json as TestData;

describe('Database repository...', () => {
  let products: Array<Product>;
  let orders: Array<Order>;
  let swishPayments: Array<SwishPayload>;

  before('Connect to MongoDB', async () => {
    await connect();
    assert(isConnected());
    test(true);
    setUpDB();
  });

  after('Remove test collections and disconnect from MongoDB', async () => {
    getCursor('products').drop();
    getCursor('baskets').drop();
    getCursor('orders').drop();
    disconnect();
  });

  async function setupTest() {
    await getCursor('products').deleteMany({});
    await getCursor('baskets').deleteMany({});
    await getCursor('orders').deleteMany({});
    products = testData.products;
    orders = testData.orders;
    swishPayments = testData.swishPayments;
  }

  describe('product calls...', () => {
    beforeEach(setupTest);

    it('contains slug index in product collection', async () => {
      const indexExists = await getCursor('products').indexExists('slug_1');
      assert(indexExists);
    });

    it('starts with empty db', async () => {
      const response = await count('products');
      assert.strictEqual(response, 0);
    });

    it('successfully adds product', async () => {
      const product = products[0];

      const response = await addProduct(product);
      assert.strictEqual(response.insertedCount, 1);
      assert.strictEqual(response.ops.length, 1);
      assert.deepStrictEqual(response.ops[0], product);

      const entries = await count('products');
      assert.strictEqual(entries, 1);
    });

    it('gets all products when db empty', async () => {
      const response = await getProducts();
      assert.strictEqual(response.length, 0);
    });

    it('gets all products', async () => {
      const product = products[0];
      await addProduct(product);

      const response = await getProducts();
      assert.strictEqual(response.length, 1);
      assert.deepStrictEqual(response[0], product);
    });

    it('gets single product by id', async () => {
      const product = products[0];
      const addResponse = await addProduct(product);
      const { insertedId: id } = addResponse;

      const response = await getProductById(id);
      assert.strictEqual(response.length, 1);
      assert.deepStrictEqual(response[0], product);
    });
  });

  describe('basket calls...', () => {
    beforeEach(setupTest);

    it('successfully creates empty basket', async () => {
      const response = await addBasket();
      assert.strictEqual(response.insertedCount, 1);
      assert.strictEqual(response.ops.length, 1);
      assert.deepStrictEqual(response.ops[0].items, []);
    });

    it('successfully gets basket', async () => {
      const addResponse = await addBasket();
      const { insertedId: id } = addResponse;

      const response = await getBasketById(id.toHexString());
      assert.strictEqual(response.length, 1);
      assert.deepStrictEqual(response[0]._id, id);
    });

    it('successfully adds item to basket', async () => {
      const addResponse = await addBasket();
      const basketId = addResponse.insertedId.toString();

      const updateResponse = await updateBasketById(basketId, {
        productSlug: 'abcdef123456',
        quantity: 3,
        deliveryType: 'collection',
        deliveryDate: '2020-12-2'
      });
      assert.strictEqual(updateResponse.modifiedCount, 1);

      const getResponse = await getBasketById(basketId);
      assert.strictEqual(getResponse.length, 1);
      assert.strictEqual(getResponse[0].items[0].productSlug, 'abcdef123456');
      assert.strictEqual(getResponse[0].items[0].quantity, 3);
      assert.strictEqual(getResponse[0].items[0].deliveryType, 'collection');
      assert.strictEqual(getResponse[0].items[0].deliveryDate, '2020-12-2');
    });

    it('successfully removes item from basket', async () => {
      const addResponse = await addBasket();
      const basketId = addResponse.insertedId.toHexString();
      await updateBasketById(basketId, {
        productSlug: 'abcdef123456',
        quantity: 5,
        deliveryType: 'collection',
        deliveryDate: '2020-12-2'
      });

      const checkResponse = await getBasketById(basketId);
      assert.strictEqual(checkResponse.length, 1);
      assert.strictEqual(checkResponse[0].items[0].quantity, 5);

      const removeResponse = await removeItemFromBasket(basketId, {
        productSlug: 'abcdef123456',
        deliveryType: 'collection',
        deliveryDate: '2020-12-2'
      });
      assert.strictEqual(removeResponse.modifiedCount, 1);

      const getResponse = await getBasketById(basketId);
      assert.strictEqual(getResponse.length, 1);
      assert.strictEqual(getResponse[0].items.length, 0);
    });

    it('successfully updates quantity of item already in basket', async () => {
      const addResponse = await addBasket();
      const basketId = addResponse.insertedId.toHexString();
      await updateBasketById(basketId, {
        productSlug: 'abcdef123456',
        deliveryType: 'collection',
        deliveryDate: '2020-12-2',
        quantity: 3
      });
      await removeItemFromBasket(basketId, {
        productSlug: 'abcdef123456',
        deliveryType: 'collection',
        deliveryDate: '2020-12-2'
      });
      await updateBasketById(basketId, {
        productSlug: 'abcdef123456',
        deliveryType: 'collection',
        deliveryDate: '2020-12-2',
        quantity: 6
      });

      const getResponse = await getBasketById(basketId);
      assert.strictEqual(getResponse.length, 1);
      assert.strictEqual(getResponse[0].items[0].quantity, 6);
    });

    it('successfully removes basket', async () => {
      const addResponse = await addBasket();
      const id = addResponse.insertedId.toHexString();
      let numBaskets = await count('baskets');
      assert.strictEqual(numBaskets, 1);

      const deleteResponse = await removeBasketById(id);
      numBaskets = await count('baskets');
      assert.strictEqual(deleteResponse.deletedCount, 1);
      assert.strictEqual(numBaskets, 0);
    });

    it('successfully cleans up old baskets', async () => {
      await getCursor('baskets').insertOne({
        _id: new ObjectId('123456780000000000000000')
      });
      const addResponse = await addBasket();
      const id = addResponse.insertedId.toHexString();
      let numEntries = await count('baskets');
      assert.strictEqual(numEntries, 2);

      await cleanupBaskets(1);
      numEntries = await count('baskets');
      assert.strictEqual(numEntries, 1);

      const getEntry = await getBasketById(id);
      assert.strictEqual(getEntry.length, 1);
      assert.notStrictEqual(getEntry[0]._id.toString(), '123456780000000000000000');
    });
  });

  describe('order calls...', () => {
    beforeEach(setupTest);

    it('contains Swish ID index in order collection', async () => {
      const indexExists = await getCursor('orders').indexExists('payment.swish.id_1');
      assert(indexExists);
    });

    it('contains Swish Refund ID index in order refunds collection', async () => {
      const indexExists = await getCursor('orders').indexExists('payment.refunds.id_1');
      assert(indexExists);
    });

    it('successfully adds new order', async () => {
      const order = orders[0];
      const response = await addOrder(order);
      assert.strictEqual(response.insertedCount, 1);
      assert.strictEqual(response.ops.length, 1);
      assert.deepStrictEqual(response.ops[0], order);
    });

    it('successfully gets order', async () => {
      const order = orders[0];
      const addResponse = await addOrder(order);
      const insertedId = addResponse.insertedId.toHexString();

      const getResponse = await getOrderById(insertedId);
      assert.strictEqual(getResponse.length, 1);
      assert.deepStrictEqual(getResponse[0], order);
    });

    it('successfully updates an order', async () => {
      const order = orders[0];
      const addResponse = await addOrder(order);
      const insertedId = addResponse.insertedId.toHexString();

      const response = await updateOrder(insertedId, {
        $set: {
          'payment.confirmationEmailSent': true
        }
      });
      assert.strictEqual(response.modifiedCount, 1);

      const getResponse = await getOrderById(insertedId);
      assert.strictEqual(getResponse.length, 1);
      assert(getResponse[0].payment.confirmationEmailSent);
    });

    it('successfully removes an order', async () => {
      const order = orders[0];
      const addResponse = await addOrder(order);
      const insertedId = addResponse.insertedId.toHexString();

      let numOrders = await count('orders');
      assert.strictEqual(numOrders, 1);

      const removeResponse = await removeOrder(insertedId);
      assert.strictEqual(removeResponse.deletedCount, 1);

      numOrders = await count('orders');
      assert.strictEqual(numOrders, 0);
    });

    it('successfully updates order payment status', async () => {
      const order = orders[0];
      const payment = swishPayments[0];
      const addResponse = await addOrder(order);
      const insertedId = addResponse.insertedId.toHexString();

      const response = await updateSwishPayment(payment);
      assert.strictEqual(response.modifiedCount, 1);

      const getResponse = await getOrderById(insertedId);
      assert.strictEqual(getResponse.length, 1);
      assert.deepStrictEqual(getResponse[0].payment.method === 'swish' && getResponse[0].payment.swish, payment);
    });

    it('successfully checks Swish status', async () => {
      await addOrder(orders[1]);

      const swishId = orders[1].payment.method === 'swish'
        ? orders[1].payment.swish.id
        : '';
      const firstResponse = await getSwishStatus(swishId);
      assert.strictEqual(firstResponse.length, 1);
      assert(!firstResponse[0].status);

      await updateSwishPayment(swishPayments[1]);
      const secondResponse = await getSwishStatus(swishId);
      assert.strictEqual(secondResponse.length, 1);
      assert.deepStrictEqual(secondResponse[0], swishPayments[1]);
    });
  });
});
