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
const {
  getOrders,
  getOrder,
  createOrder,
  checkPaymentStatus,
  swishPaymentCallback,
  swishRefundCallback,
  setStatus,
  sendRefund,
  apiCheckRefund
} = require('../controllers/orderController')();
const { login, checkAdminKey } = require('../controllers/authController');

function routes() {
  const apiRoutes = express.Router();

  // Routes to get products
  apiRoutes.route('/products').get(fetchProducts);
  apiRoutes.route('/product/:productSlug').get(fetchProduct); // Never Used?

  // Routes to set up baskets
  apiRoutes.route('/basket/:basketId').get(apiGetBasket);
  apiRoutes.route('/basket').post(apiCreateBasket, apiGetBasket);
  apiRoutes.route('/basket/update/zone/:basketId').put(updateZoneBasket, apiGetBasket);
  apiRoutes.route('/basket/update/quantity/:basketId').put(updateBasket, apiGetBasket);
  apiRoutes.route('/basket/update/remove/:basketId').put(removeFromBasket, apiGetBasket);
  apiRoutes.route('/basket/:basketId').delete(apiDeleteBasket, apiCreateBasket, apiGetBasket);

  // Order Routes
  apiRoutes.route('/order/:basketId').post(createOrder);
  apiRoutes.route('/order/swish/:swishId').get(checkPaymentStatus);
  apiRoutes.route('/order/swish/paymentCallback').post(swishPaymentCallback);
  apiRoutes.route('/order/swish/refundCallback').post(swishRefundCallback);
  apiRoutes.route('/order/refund').put(checkAdminKey, sendRefund, apiCheckRefund, getOrder);
  apiRoutes.route('/order/refund/:refundId').get(checkAdminKey, apiCheckRefund, getOrder);

  // Admin Routes
  apiRoutes.route('/orders').get(checkAdminKey, getOrders);
  apiRoutes.route('/order/:orderId').get(checkAdminKey, getOrder);
  apiRoutes.route('/order/status').put(checkAdminKey, setStatus);

  // User Routes
  apiRoutes.route('/login').post(login);

  return apiRoutes;
}

module.exports = routes;
