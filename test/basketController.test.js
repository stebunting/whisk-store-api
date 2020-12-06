// Page Tag
const tag = 'store-api:basketController.test';

// Requirements
const assert = require('assert').strict;
const sinon = require('sinon');
const db = require('../src/controllers/dbController');
const mockObjects = require('./mockObjects');
const testData = require('./testData.json');

describe('Basket Calls...', () => {
  let cleanUpBasketsStub;
  let createBasketStub;
  let getBasketByIdStub;
  let apiCreateBasket;
  let apiGetBasket;
  let req;
  let res;
  let baskets;

  const setUpStubs = () => {
    baskets = testData.baskets;
    req = mockObjects.request();
    res = mockObjects.response();
  };

  const resetStubs = () => {
    cleanUpBasketsStub.resetHistory();
    createBasketStub.resetHistory();
    getBasketByIdStub.resetHistory();
  };

  before(() => {
    // Stubs
    cleanUpBasketsStub = sinon.stub(db, 'cleanupBaskets');
    createBasketStub = sinon.stub(db, 'addBasket');
    getBasketByIdStub = sinon.stub(db, 'getBasketById');

    // File under test
    ({ apiCreateBasket, apiGetBasket } = require('../src/controllers/basketController'));
  });

  after(() => {
    // Restore Methods
    cleanUpBasketsStub.restore();
    createBasketStub.restore();
    getBasketByIdStub.restore();
  });

  describe.skip('to get a basket...', () => {
    beforeEach(setUpStubs);
    afterEach(resetStubs);

    it('gets basket with valid id', async () => {
      getBasketByIdStub.returns(baskets[1]);
      req = mockObjects.request({ basketId: 'validId' });
      await apiGetBasket(req, res);

      assert(getBasketByIdStub.calledOnce);
      assert(getBasketByIdStub.calledWith('validId'));
      assert(res.status.calledWith(200));
      assert(res.status.calledOnce);
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
