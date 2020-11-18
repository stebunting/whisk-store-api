// Requirements
const assert = require('assert').strict;
const sinon = require('sinon');
const db = require('../src/controllers/dbController');
const mockObjects = require('./mockObjects');
const testData = require('./testData.json');

describe.only('GET...', () => {
  let getBasketByIdStub;
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
    getBasketByIdStub.resetHistory();
  };

  before(() => {
    // Stubs
    getBasketByIdStub = sinon.stub(db, 'getBasketById');

    // File under test
    ({ apiGetBasket } = require('../src/controllers/basketController'));
  });

  after(() => {
    // Restore Methods
    getBasketByIdStub.restore();
  });

  describe('get basket route...', () => {
    beforeEach(setUpStubs);
    afterEach(resetStubs);

    it('gets basket with valid id', async () => {
      getBasketByIdStub.returns(baskets[0]);
      req = mockObjects.request({ basketId: 'validId' });
      await apiGetBasket(req, res);

      assert(getBasketByIdStub.calledOnce);
      assert(getBasketByIdStub.calledWith('validId'));
      assert(res.status.calledWith(200));
      assert(res.status.calledOnce);
    });
  });
});
