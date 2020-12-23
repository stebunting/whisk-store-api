// Requirements
import assert from 'assert';
import sinon, { SinonStub } from 'sinon';

// Controllers
import * as db from '../src/controllers/dbController';
import { Product } from '../src/types/Product';
import * as mockObjects from './mockObjects';

// Page Tag
const tag = 'store-api:productsController.test';
const testData = require('./testData.json');

describe('Product Calls...', () => {
  let getProductsStub: SinonStub<
    [query?: { [key: string]: any; }],
    Promise<Array<Product>>
  >;
  let getProductBySlugStub: SinonStub<
    [slug: string],
    Promise<Array<Product>>
  >;
  let fetchProducts: (
    req: mockObjects.MockRequest, res: mockObjects.MockResponse
  ) => Promise<Array<Product>>;
  let fetchProduct: (
    req: mockObjects.MockRequest, res: mockObjects.MockResponse
  ) => Promise<Array<Product>>;
  let req: mockObjects.MockRequest;
  let res: mockObjects.MockResponse;
  let products: Array<Product>;

  const setUpStubs = () => {
    products = testData.products;
    getProductsStub.resolves(products);
    req = mockObjects.request();
    res = mockObjects.response();
  };

  const resetStubs = () => sinon.resetHistory();

  before(() => {
    // Stubs
    getProductsStub = sinon.stub(db, 'getProducts');
    getProductBySlugStub = sinon.stub(db, 'getProductBySlug');

    // File under test
    ({ fetchProducts, fetchProduct } = require('../src/controllers/productsController'));
  });

  after(() => sinon.restore());

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
      await fetchProducts(req, res);

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
      getProductBySlugStub.resolves([]);
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
      await fetchProduct(req, res);

      assert(getProductBySlugStub.calledOnce);
      assert(res.status.calledWith(500));
      assert(res.status.calledOnce);
      assert(res.json.calledWith({ status: 'error' }));
      assert(res.json.calledOnce);
    });

    it('gets product with valid id', async () => {
      getProductBySlugStub.resolves([products[0]]);
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
