// Page Tag
const tag = 'store-api:basketController.test';

// Requirements
const assert = require('assert').strict;
const sinon = require('sinon');
const debug = require('debug')(tag);
const db = require('../src/controllers/dbController');
const mockObjects = require('./mockObjects');
const testData = require('./testData.json');

describe.skip('Basket Calls...', () => {
  let cleanUpBasketsStub;
  let createBasketStub;
  let getBasketByIdStub;
  let getProductByIdStub;
  let apiCreateBasket;
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

  const resetStubs = () => {
    cleanUpBasketsStub.resetHistory();
    createBasketStub.resetHistory();
    getBasketByIdStub.resetHistory();
    getProductByIdStub.resetHistory();
  };

  before(() => {
    // Stubs
    cleanUpBasketsStub = sinon.stub(db, 'cleanupBaskets');
    createBasketStub = sinon.stub(db, 'addBasket');
    getBasketByIdStub = sinon.stub(db, 'getBasketById');
    getProductByIdStub = sinon.stub(db, 'getProductById');

    // File under test
    ({ apiCreateBasket, getBasket } = require('../src/controllers/basketController'));
  });

  after(() => {
    // Restore Methods
    cleanUpBasketsStub.restore();
    createBasketStub.restore();
    getBasketByIdStub.restore();
    getProductByIdStub.restore();
  });

  describe('to get a basket...', () => {
    beforeEach(setUpStubs);
    afterEach(resetStubs);

    it('returns no baskets with invalid id', async () => {
      getBasketByIdStub.resolves([]);
      await assert.rejects(getBasket(req, res));

      assert(getBasketByIdStub.calledOnce);
    });

    it('returns baskets', async () => {
      const product = products[0];
      getBasketByIdStub.resolves(baskets[1]);
      getProductByIdStub.resolves(product);

      const response = await getBasket(req, res);
      assert(getBasketByIdStub.calledOnce);
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
