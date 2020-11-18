// Requirements
const assert = require('assert').strict;
const sinon = require('sinon');
const db = require('../src/controllers/dbController');
const mockObjects = require('./mockObjects');
const testData = require('./testData.json');

describe('GET...', () => {
  let getProductsStub;
  let getProductByIdStub;
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
    getProductByIdStub.resetHistory();
  };

  before(() => {
    // Stubs
    getProductsStub = sinon.stub(db, 'getProducts');
    getProductByIdStub = sinon.stub(db, 'getProductById');

    // File under test
    ({ fetchProducts, fetchProduct } = require('../src/controllers/productsController'));
  });

  after(() => {
    // Restore Methods
    getProductsStub.restore();
    getProductByIdStub.restore();
  });

  describe('product list route...', () => {
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
      assert.strictEqual(jsonCall.products[0].grossPrice, 450);
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

  describe('single product route...', () => {
    beforeEach(setUpStubs);
    afterEach(resetStubs);

    it('fails to get product with invalid id', async () => {
      getProductByIdStub.returns([]);
      req = mockObjects.request({ productId: 'invalidId' });
      await fetchProduct(req, res);

      assert(getProductByIdStub.calledOnce);
      assert(getProductByIdStub.calledWith('invalidId'));
      assert(res.status.calledWith(400));
      assert(res.status.calledOnce);
      assert(res.json.calledWith({ status: 'error' }));
      assert(res.json.calledOnce);
    });

    it('returns error when product list db call fails', async () => {
      getProductByIdStub.rejects();
      req = mockObjects.request({ productId: 'validId' });
      assert.rejects(await fetchProduct(req, res));

      assert(getProductByIdStub.calledOnce);
      assert(res.status.calledWith(500));
      assert(res.status.calledOnce);
      assert(res.json.calledWith({ status: 'error' }));
      assert(res.json.calledOnce);
    });

    it('gets product with valid id', async () => {
      getProductByIdStub.returns([products[0]]);
      req = mockObjects.request({ productId: 'validId' });
      await fetchProduct(req, res);

      assert(getProductByIdStub.calledOnce);
      assert(getProductByIdStub.calledWith('validId'));
      assert(res.status.calledWith(200));
      assert(res.status.calledOnce);

      const jsonCall = res.json.getCall(0).args[0];
      assert.strictEqual(jsonCall.status, 'ok');
      assert.strictEqual(jsonCall.product.name, 'Christmas Box');
      assert.strictEqual(jsonCall.product.description, 'A Christmas Box');
      assert.strictEqual(jsonCall.product.grossPrice, 450);
      assert(res.json.calledOnce);
    });
  });
});
