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
  getBasketById,
  removeBasketById,
  addOrder
} = require('../src/controllers/dbController')();

describe('Database testing...', () => {
  let products;
  let orders;

  before('Connect to MongoDB', async () => {
    await connect();
    assert(isConnected());
    test(true);
  });

  after('Remove test collections and disconnect from MongoDB', async () => {
    await getCursor('products').drop();
    await getCursor('baskets').drop();
    disconnect();
  });

  async function setupTest() {
    await getCursor('products').deleteMany({});
    await getCursor('baskets').deleteMany({});
    products = testData.products;
    orders = testData.orders;
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

  describe('Baskets...', () => {
    beforeEach(setupTest);

    it('successfully creates empty basket...', async () => {
      const response = await addBasket();
      assert.strictEqual(response.insertedCount, 1);
      assert.strictEqual(response.ops.length, 1);
      assert.deepStrictEqual(response.ops[0].items, {});
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

      const updateResponse = await updateBasketById(id, 'abcdef123456', 3);
      assert.strictEqual(updateResponse.modifiedCount, 1);

      const getResponse = await getBasketById(id);
      assert.strictEqual(getResponse.length, 1);
      assert.strictEqual(getResponse[0].items.abcdef123456, 3);
    });

    it('successfully increments item already in basket...', async () => {
      const addResponse = await addBasket();
      const { insertedId: id } = addResponse;
      await updateBasketById(id, 'abcdef123456', 3);
      await updateBasketById(id, 'abcdef123456', 2);

      const getResponse = await getBasketById(id);
      assert.strictEqual(getResponse.length, 1);
      assert.strictEqual(getResponse[0].items.abcdef123456, 5);
    });

    it('successfully decrements item already in basket...', async () => {
      const addResponse = await addBasket();
      const { insertedId: id } = addResponse;
      await updateBasketById(id, 'abcdef123456', 8);
      await updateBasketById(id, 'abcdef123456', -4);

      const getResponse = await getBasketById(id);
      assert.strictEqual(getResponse.length, 1);
      assert.strictEqual(getResponse[0].items.abcdef123456, 4);
    });

    it('successfully removes basket...', async () => {
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
  });
});
