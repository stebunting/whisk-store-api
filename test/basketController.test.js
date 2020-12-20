// Page Tag
const tag = 'store-api:basketController.test';

// Requirements
const assert = require('assert').strict;
const sinon = require('sinon');
const rewire = require('rewire');
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
  let removeItemFromBasketStub;
  let updateBasketByIdStub;
  let updateBasketZoneStub;
  let removeBasketByIdStub;
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
    removeItemFromBasketStub = sinon.stub(db, 'removeItemFromBasket');
    updateBasketByIdStub = sinon.stub(db, 'updateBasketById');
    updateBasketZoneStub = sinon.stub(db, 'updateBasketZone');
    removeBasketByIdStub = sinon.stub(db, 'removeBasketById');

    // File under test
    basketController = rewire('../src/controllers/basketController');
  });

  after(() => sinon.restore());

  describe('to get a basket...', () => {
    beforeEach(setUpStubs);
    afterEach(resetStubs);

    it('returns no baskets with invalid id', async () => {
      getBasketByIdStub.resolves([]);
      await assert.rejects(basketController.getBasket(req, res));

      assert(getBasketByIdStub.calledOnce);
      assert.strictEqual(getProductBySlugStub.callCount, 0);
    });

    it('returns no baskets with invalid product slugs', async () => {
      getBasketByIdStub.resolves([baskets[1]]);
      getProductBySlugStub.resolves([]);

      await assert.rejects(basketController.getBasket('fakeBasketId'));

      assert(getBasketByIdStub.calledOnce);
      assert(getBasketByIdStub.calledWith('fakeBasketId'));
    });

    it('returns correctly formatted baskets', async () => {
      const product = products[0];
      getBasketByIdStub.resolves([baskets[1]]);
      getProductBySlugStub.resolves([product]);

      const basket = await basketController.getBasket('fakeBasketId');
      assert(getBasketByIdStub.calledOnce);
      assert(getBasketByIdStub.calledWith('fakeBasketId'));
      assert(getProductBySlugStub.calledTwice);
      assert(getProductBySlugStub.alwaysCalledWith(baskets[1].slug));

      // Assert Basket Id
      assert('basketId' in basket);
      assert.strictEqual(typeof basket.basketId, 'string');

      // Assert Items Array
      assert.strictEqual(basket.items.length, 2);
      basket.items.forEach((item) => {
        assert.deepStrictEqual(item.details, product);
        assert('deliveryType' in item);
        assert.strictEqual(typeof item.deliveryType, 'string');
        assert('deliveryDate' in item);
        assert.strictEqual(typeof item.deliveryDate, 'string');
        assert('slug' in item);
        assert.strictEqual(typeof item.slug, 'string');
        assert('quantity' in item);
        assert.strictEqual(typeof item.quantity, 'number');
        assert('name' in item);
        assert.strictEqual(typeof item.name, 'string');
        assert('linePrice' in item);
        assert.strictEqual(typeof item.linePrice, 'number');
        assert('momsRate' in item);
        assert.strictEqual(typeof item.momsRate, 'number');
        assert('grossPrice' in item);
        assert.strictEqual(typeof item.grossPrice, 'number');
        assert('details' in item);
        assert.strictEqual(typeof item.details, 'object');
        assert.strictEqual(item.linePrice, item.quantity * item.grossPrice);
      });

      // Assert Delivery Array
      assert('delivery' in basket);
      assert.strictEqual(typeof basket.delivery, 'object');
      assert('zone' in basket.delivery);
      assert.strictEqual(typeof basket.delivery.zone, 'number');
      assert('address' in basket.delivery);
      assert.strictEqual(typeof basket.delivery.address, 'string');
      assert('deliveryRequired' in basket.delivery);
      assert.strictEqual(typeof basket.delivery.deliveryRequired, 'boolean');
      assert('details' in basket.delivery);
      assert.strictEqual(typeof basket.delivery.details, 'object');
      assert('deliverable' in basket.delivery);
      assert.strictEqual(typeof basket.delivery.deliverable, 'boolean');
      assert('momsRate' in basket.delivery);
      assert.strictEqual(typeof basket.delivery.momsRate, 'number');
      assert('deliveryTotal' in basket.delivery);
      assert.strictEqual(typeof basket.delivery.deliveryTotal, 'number');

      // Assert Statement
      assert('statement' in basket);
      assert.strictEqual(typeof basket.statement, 'object');
      assert('bottomLine' in basket.statement);
      assert.strictEqual(typeof basket.statement.bottomLine, 'object');
      assert('totalDelivery' in basket.statement.bottomLine);
      assert.strictEqual(typeof basket.statement.bottomLine.totalDelivery, 'number');
      assert('totalMoms' in basket.statement.bottomLine);
      assert.strictEqual(typeof basket.statement.bottomLine.totalMoms, 'number');
      assert('totalPrice' in basket.statement.bottomLine);
      assert.strictEqual(typeof basket.statement.bottomLine.totalPrice, 'number');

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

      await basketController.apiGetBasket(req, res);
      assert(res.status.calledWith(200));
      assert(res.status.calledOnce);
      assert(res.json.calledOnce);
    });

    it('returns a new basket with invalid id supplied', async () => {
      req = mockObjects.request({ basketId: 'invalidBasketId' });

      const getBasket = sinon
        .stub(basketController, 'getBasket')
        .onFirstCall()
        .rejects()
        .onSecondCall()
        .resolves({ basket: 'validBasketObject' });

      const createBasketFn = basketController.__get__('createBasket');
      const createBasket = sinon
        .stub()
        .resolves('newBasketId');

      basketController.__set__('getBasket', getBasket);
      basketController.__set__('createBasket', createBasket);

      await basketController.apiGetBasket(req, res);
      assert(getBasket.calledTwice);
      assert(getBasket.calledWith('invalidBasketId'));
      assert(getBasket.firstCall.calledWith('invalidBasketId'));
      assert(getBasket.secondCall.calledWith('newBasketId'));

      assert(res.status.calledWith(200));
      assert(res.status.calledOnce);
      assert(res.json.calledOnce);

      assert(res.json.calledWith({
        status: 'ok',
        basket: {
          basket: 'validBasketObject'
        }
      }));

      getBasket.restore();
      basketController.__set__('createBasket', createBasketFn);
    });
  });

  describe('to create a new basket through the api...', () => {
    beforeEach(setUpStubs);
    afterEach(resetStubs);

    it('creates a new basket', async () => {
      createBasketStub.returns({ insertedId: 'abcdef123456' });
      const { next } = mockObjects;
      await basketController.apiCreateBasket(req, res, next);

      assert(cleanUpBasketsStub.calledOnce);
      assert(cleanUpBasketsStub.calledWith(7));
      assert(createBasketStub.calledOnce);
      assert(next.calledOnce);
      assert.strictEqual(req.params.id, 'abcdef123456');
    });
  });

  describe('to update a basket through the api...', () => {
    beforeEach(setUpStubs);
    afterEach(resetStubs);

    it('updates a basket', async () => {
      req = mockObjects.request(
        { basketId: 'updateBasketId' },
        { payload: 'payload' }
      );
      const { next } = mockObjects;

      await basketController.updateBasket(req, res, next);

      assert(removeItemFromBasketStub.calledOnce);
      assert(removeItemFromBasketStub.calledWith(
        'updateBasketId',
        { payload: 'payload' }
      ));

      assert(updateBasketByIdStub.calledOnce);
      assert(updateBasketByIdStub.calledWith(
        'updateBasketId',
        { payload: 'payload' }
      ));

      assert(next.calledOnce);
      assert(next.calledWith());
    });

    it('updates a basket zone', async () => {
      req = mockObjects.request(
        { basketId: 'updateBasketZoneId' },
        { location: 'location' }
      );
      const { next } = mockObjects;

      await basketController.updateZoneBasket(req, res, next);

      assert(updateBasketZoneStub.calledOnce);
      assert(updateBasketZoneStub.calledWith(
        'updateBasketZoneId',
        'location'
      ));

      assert(next.calledOnce);
      assert(next.calledWith());
    });

    it('removes an item from the basket', async () => {
      req = mockObjects.request(
        { basketId: 'removeBasketId' },
        { payload: 'payload' }
      );
      const { next } = mockObjects;

      await basketController.removeFromBasket(req, res, next);

      assert(removeItemFromBasketStub.calledOnce);
      assert(removeItemFromBasketStub.calledWith(
        'removeBasketId',
        { payload: 'payload' }
      ));

      assert(next.calledOnce);
      assert(next.calledWith());
    });

    it('removes a basket', async () => {
      req = mockObjects.request({ basketId: 'removeBasketId' });
      const { next } = mockObjects;

      await basketController.apiDeleteBasket(req, res, next);

      assert(removeBasketByIdStub.calledOnce);
      assert(removeBasketByIdStub.calledWith('removeBasketId'));

      assert(next.calledOnce);
      assert(next.calledWith());
    });
  });
});
