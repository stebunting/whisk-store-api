// Page Tag
const tag = 'store-api:basketController.test';

// Requirements
const assert = require('assert').strict;
const sinon = require('sinon');
const debug = require('debug')(tag);
const db = require('../src/controllers/dbController');
const mockObjects = require('./mockObjects');
const testData = require('./testData.json');

describe('Basket Calls...', () => {
  let basketController;
  let cleanUpBasketsStub;
  let createBasketStub;
  let getBasketByIdStub;
  let getProductBySlugStub;
  let apiCreateBasket;
  let apiGetBasket;
  let getBasket;
  let req;
  let res;
  let baskets;
  let products;

  const setUpStubs = () => {
    baskets = testData.baskets;
    products = testData.products;
    req = mockObjects.request();
    res = mockObjects.response();
  };

  const resetStubs = () => sinon.resetHistory();

  before(() => {
    // Stubs
    cleanUpBasketsStub = sinon.stub(db, 'cleanupBaskets');
    createBasketStub = sinon.stub(db, 'addBasket');
    getBasketByIdStub = sinon.stub(db, 'getBasketById');
    getProductBySlugStub = sinon.stub(db, 'getProductBySlug');

    // File under test
    basketController = require('../src/controllers/basketController');
    ({ apiCreateBasket, getBasket, apiGetBasket } = basketController);
  });

  after(() => sinon.restore());

  describe('to get a basket...', () => {
    beforeEach(setUpStubs);
    afterEach(resetStubs);

    it('returns no baskets with invalid id', async () => {
      getBasketByIdStub.resolves([]);
      await assert.rejects(getBasket(req, res));

      assert(getBasketByIdStub.calledOnce);
      assert.strictEqual(getProductBySlugStub.callCount, 0);
    });

    it('returns correctly formatted baskets', async () => {
      const product = products[0];
      getBasketByIdStub.resolves([baskets[1]]);
      getProductBySlugStub.resolves([product]);

      const basket = await getBasket('fakeBasketId');
      assert(getBasketByIdStub.calledOnce);
      assert(getBasketByIdStub.calledWith('fakeBasketId'));
      assert(getProductBySlugStub.calledTwice);
      assert(getProductBySlugStub.alwaysCalledWith(baskets[1].slug));

      assert.strictEqual(basket.items.length, 2);
      basket.items.forEach((item) => {
        assert.deepStrictEqual(item.details, product);
        assert.strictEqual(item.linePrice, item.quantity * item.grossPrice);
      });

      assert.strictEqual(
        basket.items.reduce((a, b) => a + b.linePrice, basket.delivery.deliveryTotal),
        basket.statement.bottomLine.totalPrice
      );
      assert.strictEqual(
        basket.statement.bottomLine.totalDelivery,
        basket.delivery.deliveryTotal
      );
    });
  });

  describe('to get a basket through the api...', () => {
    beforeEach(setUpStubs);
    afterEach(resetStubs);

    it('returns correctly formatted basket', async () => {
      req = mockObjects.request({ basketId: 'basketIdParameter' });

      const product = products[0];
      getBasketByIdStub.resolves([baskets[1]]);
      getProductBySlugStub.resolves([product]);

      await apiGetBasket(req, res);
      assert(res.status.calledWith(200));
      assert(res.status.calledOnce);
      assert(res.json.calledOnce);
    });

    it.skip('returns a new basket with invalid id supplied', async () => {
      req = mockObjects.request({ basketId: 'invalidBasketId' });

      // NEED TO GET THIS SPY WORKING
      sinon.spy(basketController, 'getBasket');
      await apiGetBasket(req, res);
      assert(res.status.calledWith(200));
      assert(res.status.calledOnce);
      assert(res.json.calledOnce);

      console.log(basketController.getBasket.callCount);

      // CALL MUST CREATE A NEW BASKET
    });
  });

  describe('to create a new basket...', () => {
    beforeEach(setUpStubs);
    afterEach(resetStubs);

    it('creates a new basket', async () => {
      createBasketStub.returns({ insertedId: 'abcdef123456' });
      const { next } = mockObjects;
      await apiCreateBasket(req, res, next);

      assert(cleanUpBasketsStub.calledOnce);
      assert(cleanUpBasketsStub.calledWith(7));
      assert(createBasketStub.calledOnce);
      assert(next.calledOnce);
      assert.strictEqual(req.params.id, 'abcdef123456');
    });
  });
});
