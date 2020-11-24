// Requirements
const assert = require('assert').strict;
const testData = require('./testData.json');
const {
  connect,
  test,
  isConnected,
  getCursor,
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
  updateOrder
} = require('../src/controllers/dbController');

describe('Database testing...', () => {
  let products;
  let orders;
  let swishPayments;

  before('Connect to MongoDB', async () => {
    await connect();
    assert(isConnected());
    test(true);
  });

  after('Remove test collections and disconnect from MongoDB', async () => {
    await getCursor('products').drop();
    await getCursor('baskets').drop();
    await getCursor('orders').drop();
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

  describe('Products...', () => {
    beforeEach(setupTest);

    it('starts with empty db...', async () => {
      const response = await count('products');
      assert.strictEqual(response, 0);
    });

    it('successfully added...', async () => {
      const product = products[0];

      const response = await addProduct(product);
      assert.strictEqual(response.insertedCount, 1);
      assert.strictEqual(response.ops.length, 1);
      assert.deepStrictEqual(response.ops[0], product);

      const entries = await count('products');
      assert.strictEqual(entries, 1);
    });

    it('gets all products when db empty...', async () => {
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

  describe.skip('Baskets...', () => {
    beforeEach(setupTest);

    it('successfully creates empty basket...', async () => {
      const response = await addBasket();
      assert.strictEqual(response.insertedCount, 1);
      assert.strictEqual(response.ops.length, 1);
      assert.deepStrictEqual(response.ops[0].items, []);
    });

    it('successfully gets basket...', async () => {
      const addResponse = await addBasket();
      const { insertedId: id } = addResponse;

      const response = await getBasketById(id);
      assert.strictEqual(response.length, 1);
      assert.deepStrictEqual(response[0]._id, id);
    });

    it('successfully adds item to basket...', async () => {
      const addResponse = await addBasket();
      const { insertedId: id } = addResponse;

      const updateResponse = await updateBasketById({
        productId: 'abcdef123456',
        quantity: 3,
        deliveryType: 'collection',
        deliveryDate: '2020-50-2'
      });
      assert.strictEqual(updateResponse.modifiedCount, 1);

      const getResponse = await getBasketById(id);
      assert.strictEqual(getResponse.length, 1);
      assert.strictEqual(getResponse[0].items[0].quantity, 3);
    });

    it('successfully updates quantity of item already in basket', async () => {
      const addResponse = await addBasket();
      const { insertedId: id } = addResponse;
      await updateBasketById(id, 'abcdef123456', 3);
      await updateBasketById(id, 'abcdef123456', 6);

      const getResponse = await getBasketById(id);
      assert.strictEqual(getResponse.length, 1);
      assert.strictEqual(getResponse[0].items.abcdef123456, 6);
    });

    it('successfully removes item from basket', async () => {
      const addResponse = await addBasket();
      const { insertedId: basketId } = addResponse;
      await updateBasketById(basketId, 'abcdef123456', 5);

      const checkResponse = await getBasketById(basketId);
      assert.strictEqual(checkResponse.length, 1);
      assert.strictEqual(checkResponse[0].items.abcdef123456, 5);

      const removeResponse = await removeItemFromBasket(basketId, 'abcdef123456');
      assert.strictEqual(removeResponse.modifiedCount, 1);

      const getResponse = await getBasketById(basketId);
      assert.strictEqual(getResponse.length, 1);
      assert.strictEqual(getResponse[0].items.abcdef123456, undefined);
    });

    it('successfully removes basket', async () => {
      const addResponse = await addBasket();
      const { insertedId: id } = addResponse;
      let numBaskets = await count('baskets');
      assert.strictEqual(numBaskets, 1);

      const deleteResponse = await removeBasketById(id);
      numBaskets = await count('baskets');
      assert.strictEqual(deleteResponse.deletedCount, 1);
      assert.strictEqual(numBaskets, 0);
    });
  });

  describe('Orders...', () => {
    beforeEach(setupTest);

    it('successfully adds new order...', async () => {
      const order = orders[0];
      const response = await addOrder(order);
      assert.strictEqual(response.insertedCount, 1);
      assert.strictEqual(response.ops.length, 1);
      assert.deepStrictEqual(response.ops[0], order);
    });

    it('successfully gets order', async () => {
      const order = orders[0];
      const addResponse = await addOrder(order);
      const { insertedId } = addResponse;

      const getResponse = await getOrderById(insertedId);
      assert.strictEqual(getResponse.length, 1);
      assert.deepStrictEqual(getResponse[0], order);
    });

    it('successfully updates an order', async () => {
      const order = orders[0];
      const addResponse = await addOrder(order);
      const { insertedId } = addResponse;

      const response = await updateOrder(insertedId, { 'payment.confirmationEmailSent': true });
      assert.strictEqual(response.modifiedCount, 1);

      const getResponse = await getOrderById(insertedId);
      assert.strictEqual(getResponse.length, 1);
      assert(getResponse[0].payment.confirmationEmailSent);
    });

    it('successfully updates order payment status', async () => {
      const order = orders[0];
      const payment = swishPayments[0];
      const addResponse = await addOrder(order);
      const { insertedId } = addResponse;

      const response = await updateSwishPayment(payment);
      assert.strictEqual(response.modifiedCount, 1);

      const getResponse = await getOrderById(insertedId);
      assert.strictEqual(getResponse.length, 1);
      assert.deepStrictEqual(getResponse[0].payment.swish, payment);
    });

    it('successfully checks Swish status', async () => {
      await addOrder(orders[1]);

      const { id: swishId } = orders[1].payment.swish;
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
