// Requirements
import assert from 'assert';
import sinon, { SinonStub } from 'sinon';
import rewire from 'rewire';
import Debug from 'debug';

// Types
import {
  DeleteWriteOpResultObject,
  InsertOneWriteOpResult,
  ObjectId,
  UpdateWriteOpResult
} from 'mongodb';

// Controllers
import * as db from '../src/controllers/dbController';
import {
  getBasket,
  apiGetBasket,
  apiCreateBasket,
  updateBasket,
  updateZoneBasket,
  removeFromBasket,
  apiDeleteBasket
} from '../src/controllers/basketController';

// Dependencies
import * as mockObjects from './mockObjects';
import { Basket, DbBasket } from '../src/types/Basket';
import { Product } from '../src/types/Product';

// Page Tag
const tag = 'store-api:basketController.test';
const debug = Debug(tag);

const testData = require('./testData.json');

describe('Basket Calls...', () => {
  let basketController: any;
  let cleanUpBasketsStub: SinonStub<[days: number], Promise<DeleteWriteOpResultObject>>;
  let addBasketStub: SinonStub<[], Promise<InsertOneWriteOpResult<DbBasket>>>;
  let getBasketByIdStub: SinonStub<[id: string], Promise<Array<DbBasket>>>;
  let getProductBySlugStub: SinonStub<[slug: string], Promise<Array<Product>>>;
  let removeItemFromBasketStub: SinonStub<
    [basketId: string,
    payload: db.UpdateBasketPayload],
    Promise<UpdateWriteOpResult>
  >;
  let updateBasketByIdStub: SinonStub<
    [basketId: string,
    payload: db.UpdateBasketPayload],
    Promise<UpdateWriteOpResult>
  >;
  let updateBasketZoneStub: SinonStub<
    [basketId: string,
    location: db.UpdateBasketLocation],
    Promise<UpdateWriteOpResult>
  >;
  let removeBasketByIdStub: SinonStub<[id: string], Promise<DeleteWriteOpResultObject>>;
  let req: mockObjects.MockRequest;
  let res: mockObjects.MockResponse;
  let baskets: Array<Basket>;
  let products: Array<Product>;

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
    addBasketStub = sinon.stub(db, 'addBasket');
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
      await assert.rejects(getBasket('basketId'));

      assert(getBasketByIdStub.calledOnce);
      assert.strictEqual(getProductBySlugStub.callCount, 0);
    });

    it('returns no baskets with invalid product slugs', async () => {
      getBasketByIdStub.resolves([baskets[1]]);
      getProductBySlugStub.resolves([]);

      await assert.rejects(getBasket('fakeBasketId'));

      assert(getBasketByIdStub.calledOnce);
      assert(getBasketByIdStub.calledWith('fakeBasketId'));
    });

    it('returns correctly formatted baskets', async () => {
      const product = products[0];
      getBasketByIdStub.resolves([baskets[1]]);
      getProductBySlugStub.resolves([product]);

      const basket = await getBasket('fakeBasketId');
      assert(getBasketByIdStub.calledOnce);
      assert(getBasketByIdStub.calledWith('fakeBasketId'));
      assert(getProductBySlugStub.calledTwice);
      assert(getProductBySlugStub.alwaysCalledWith(baskets[1].items[0].productSlug));

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
        assert('productSlug' in item);
        assert.strictEqual(typeof item.productSlug, 'string');
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

      await apiGetBasket(req, res);
      assert(res.status.calledWith(200));
      assert(res.status.calledOnce);
      assert(res.json.calledOnce);
    });

    it('returns a new basket with invalid id supplied', async () => {
      req = mockObjects.request({ basketId: 'invalidBasketId' });

      const getBasketStub = sinon
        .stub(basketController, 'getBasket')
        .onFirstCall()
        .rejects()
        .onSecondCall()
        .resolves({ basket: 'validBasketObject' });

      const createBasketFn = basketController.__get__('createBasket');
      const createBasket = sinon
        .stub()
        .resolves('newBasketId');

      basketController.__set__('getBasket', getBasketStub);
      basketController.__set__('createBasket', createBasket);

      await basketController.apiGetBasket(req, res);
      assert(getBasketStub.calledTwice);
      assert(getBasketStub.calledWith('invalidBasketId'));
      assert(getBasketStub.firstCall.calledWith('invalidBasketId'));
      assert(getBasketStub.secondCall.calledWith('newBasketId'));

      assert(res.status.calledWith(200));
      assert(res.status.calledOnce);
      assert(res.json.calledOnce);

      assert(res.json.calledWith({
        status: 'ok',
        basket: {
          basket: 'validBasketObject'
        }
      }));

      getBasketStub.restore();
      basketController.__set__('createBasket', createBasketFn);
    });
  });

  describe('to create a new basket through the api...', () => {
    beforeEach(setUpStubs);
    afterEach(resetStubs);

    it('creates a new basket', async () => {
      const insertedId = new ObjectId('abcdef123456abcdef123456');
      addBasketStub.resolves({ insertedId } as InsertOneWriteOpResult<DbBasket>);
      const { next } = mockObjects;
      await apiCreateBasket(req, res, next);

      assert(cleanUpBasketsStub.calledOnce);
      assert(cleanUpBasketsStub.calledWith(7));
      assert(addBasketStub.calledOnce);
      assert(next.calledOnce);
      assert.strictEqual(req.params.id, 'abcdef123456abcdef123456');
    });
  });

  describe('to update a basket through the api...', () => {
    beforeEach(setUpStubs);
    afterEach(resetStubs);

    it('updates a basket', async () => {
      const payload = {
        productSlug: 'slug',
        quantity: 2,
        deliveryType: 'delivery',
        deliveryDate: '2015-06-24',
      };

      req = mockObjects.request(
        { basketId: 'updateBasketId' },
        payload
      );
      const { next } = mockObjects;

      await updateBasket(req, res, next);

      assert(removeItemFromBasketStub.calledOnce);
      assert(removeItemFromBasketStub.calledWith(
        'updateBasketId',
        payload
      ));

      assert(updateBasketByIdStub.calledOnce);
      assert(updateBasketByIdStub.calledWith(
        'updateBasketId',
        payload
      ));

      assert(next.calledOnce);
      assert(next.calledWith());
    });

    it('updates a basket zone', async () => {
      const location = {
        address: 'Fake Address',
        zone: 2
      };

      req = mockObjects.request(
        { basketId: 'updateBasketZoneId' },
        { location }
      );
      const { next } = mockObjects;

      await updateZoneBasket(req, res, next);

      assert(updateBasketZoneStub.calledOnce);
      assert(updateBasketZoneStub.calledWith(
        'updateBasketZoneId',
        location
      ));

      assert(next.calledOnce);
      assert(next.calledWith());
    });

    it('removes an item from the basket', async () => {
      const payload = {
        productSlug: 'slug',
        quantity: 2,
        deliveryType: 'delivery',
        deliveryDate: '2015-06-24',
      };

      req = mockObjects.request(
        { basketId: 'removeBasketId' },
        payload
      );
      const { next } = mockObjects;

      await removeFromBasket(req, res, next);

      assert(removeItemFromBasketStub.calledOnce);
      assert(removeItemFromBasketStub.calledWith(
        'removeBasketId',
        payload
      ));

      assert(next.calledOnce);
      assert(next.calledWith());
    });

    it('removes a basket', async () => {
      req = mockObjects.request({ basketId: 'removeBasketId' });
      const { next } = mockObjects;

      await apiDeleteBasket(req, res, next);

      assert(removeBasketByIdStub.calledOnce);
      assert(removeBasketByIdStub.calledWith('removeBasketId'));

      assert(next.calledOnce);
      assert(next.calledWith());
    });
  });
});
