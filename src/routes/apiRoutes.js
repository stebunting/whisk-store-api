// Page Tag
const tag = 'store-api:products';

// Requirements
const express = require('express');
const debug = require('debug')(tag);
const { fetchProducts, fetchProduct } = require('../controllers/productsController');
const {
  apiGetBasket,
  apiCreateBasket,
  updateBasket,
  updateZoneBasket,
  removeFromBasket,
  apiDeleteBasket
} = require('../controllers/basketController');
const { createOrder, checkPaymentStatus, swishCallback } = require('../controllers/orderController')();

function routes() {
  const apiRoutes = express.Router();

  // Routes to get products
  apiRoutes.route('/products').get(fetchProducts);
  apiRoutes.route('/product/:productId').get(fetchProduct); // Never Used?

  // Routes to set up baskets
  apiRoutes.route('/basket/:basketId').get(apiGetBasket);
  apiRoutes.route('/basket').post(apiCreateBasket, apiGetBasket);
  apiRoutes.route('/basket/update/zone/:basketId').put(updateZoneBasket, apiGetBasket);
  apiRoutes.route('/basket/update/quantity/:basketId').put(updateBasket, apiGetBasket);
  apiRoutes.route('/basket/update/remove/:basketId').put(removeFromBasket, apiGetBasket);
  apiRoutes.route('/basket/:basketId').delete(apiDeleteBasket, apiCreateBasket, apiGetBasket);

  apiRoutes.route('/order/:basketId').post(createOrder);
  apiRoutes.route('/order/swish/:swishId').get(checkPaymentStatus);
  apiRoutes.route('/order/swish/callback').post(swishCallback);

  return apiRoutes;
}

module.exports = routes;
