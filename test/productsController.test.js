// Page Tag
const tag = 'store-api:productsController.test';

// Requirements
const assert = require('assert').strict;
const sinon = require('sinon');
const db = require('../src/controllers/dbController');
const mockObjects = require('./mockObjects');
const testData = require('./testData.json');

describe('Product Calls...', () => {
  let getProductsStub;
  let getProductBySlugStub;
  let fetchProducts;
  let fetchProduct;
  let req;
  let res;
  let products;

  const setUpStubs = () => {
    products = testData.products;
    getProductsStub.returns(products);
    req = mockObjects.request();
    res = mockObjects.response();
  };

  const resetStubs = () => {
    getProductsStub.resetHistory();
    getProductBySlugStub.resetHistory();
  };

  before(() => {
    // Stubs
    getProductsStub = sinon.stub(db, 'getProducts');
    getProductBySlugStub = sinon.stub(db, 'getProductBySlug');

    // File under test
    ({ fetchProducts, fetchProduct } = require('../src/controllers/productsController'));
  });

  after(() => {
    // Restore Methods
    getProductsStub.restore();
    getProductBySlugStub.restore();
  });

  describe('to get list of products...', () => {
    beforeEach(setUpStubs);
    afterEach(resetStubs);

    it('fetchs product list', async () => {
      await fetchProducts(req, res);

      assert(getProductsStub.calledOnce);
      assert(res.status.calledWith(200));
      assert(res.status.calledOnce);
      const jsonCall = res.json.getCall(0).args[0];
      assert.strictEqual(jsonCall.status, 'ok');
      assert.strictEqual(jsonCall.products.length, 1);
      assert.strictEqual(jsonCall.products[0].name, 'Christmas Box');
      assert.strictEqual(jsonCall.products[0].description, 'A Christmas Box');
      assert.strictEqual(jsonCall.products[0].grossPrice, 39500);
      assert(res.json.calledOnce);
    });

    it('returns error when product list db call fails', async () => {
      getProductsStub.rejects();
      assert.rejects(await fetchProducts(req, res));

      assert(getProductsStub.calledOnce);
      assert(res.status.calledWith(500));
      assert(res.status.calledOnce);
      assert(res.json.calledWith({ status: 'error' }));
      assert(res.json.calledOnce);
    });
  });

  describe('to get single product...', () => {
    beforeEach(setUpStubs);
    afterEach(resetStubs);

    it('gets empty array with invalid slug', async () => {
      getProductBySlugStub.returns([]);
      req = mockObjects.request({ productSlug: 'invalidSlug' });
      await fetchProduct(req, res);

      assert(getProductBySlugStub.calledOnce);
      assert(getProductBySlugStub.calledWith('invalidSlug'));
      assert(res.status.calledWith(200));
      assert(res.status.calledOnce);
      assert(res.json.calledOnce);

      const jsonCall = res.json.getCall(0).args[0];
      assert.strictEqual(jsonCall.status, 'ok');
      assert.strictEqual(jsonCall.products.length, 0);
    });

    it('returns error when product list db call fails', async () => {
      getProductBySlugStub.rejects();
      req = mockObjects.request({ productSlug: 'validSlug' });
      assert.rejects(await fetchProduct(req, res));

      assert(getProductBySlugStub.calledOnce);
      assert(res.status.calledWith(500));
      assert(res.status.calledOnce);
      assert(res.json.calledWith({ status: 'error' }));
      assert(res.json.calledOnce);
    });

    it('gets product with valid id', async () => {
      getProductBySlugStub.returns([products[0]]);
      req = mockObjects.request({ productSlug: 'validSlug' });
      await fetchProduct(req, res);

      assert(getProductBySlugStub.calledOnce);
      assert(getProductBySlugStub.calledWith('validSlug'));
      assert(res.status.calledWith(200));
      assert(res.status.calledOnce);

      const jsonCall = res.json.getCall(0).args[0];
      assert.strictEqual(jsonCall.status, 'ok');
      assert.strictEqual(jsonCall.products.length, 1);
      assert.strictEqual(jsonCall.products[0].name, 'Christmas Box');
      assert.strictEqual(jsonCall.products[0].description, 'A Christmas Box');
      assert.strictEqual(jsonCall.products[0].grossPrice, 39500);
      assert(res.json.calledOnce);
    });
  });
});
