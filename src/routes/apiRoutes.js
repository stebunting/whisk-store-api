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
  apiDeleteBasket
} = require('../controllers/basketController')();
const { createOrder, checkPaymentStatus, swishCallback } = require('../controllers/orderController')();

function routes() {
  const apiRoutes = express.Router();

  // Routes to get products
  apiRoutes.route('/products').get(fetchProducts);
  apiRoutes.route('/product/:productId').get(fetchProduct);

  // Routes to set up baskets
  apiRoutes.route('/basket/:id').get(apiGetBasket);
  apiRoutes.route('/basket').post(apiCreateBasket, apiGetBasket);
  apiRoutes.route('/basket/:id').put(updateBasket, apiGetBasket);
  apiRoutes.route('/basket/:basketId').delete(apiDeleteBasket, apiCreateBasket, apiGetBasket);

  apiRoutes.route('/order/:basketId').post(createOrder);
  apiRoutes.route('/order/swish/:swishId').get(checkPaymentStatus);
  apiRoutes.route('/order/swish/callback').post(swishCallback);

  return apiRoutes;
}

module.exports = routes;
