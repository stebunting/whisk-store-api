// Requirements
import express from 'express';
import Debug from 'debug';

// Controllers
import { login, checkAdminKey } from '../controllers/authController';
import { fetchProducts, fetchProduct } from '../controllers/productsController';
import {
  getOrders,
  getOrder,
  createOrder,
  checkPaymentStatus,
  swishPaymentCallback,
  swishRefundCallback,
  setStatus,
  sendRefund,
  apiCheckRefund
} from '../controllers/orderController';
import {
  apiGetBasket,
  apiCreateBasket,
  updateBasket,
  updateZoneBasket,
  removeFromBasket,
  apiDeleteBasket
} from '../controllers/basketController';

// Page Tag
const tag = 'store-api:products';
const debug = Debug(tag);

const apiRoutes = express.Router();

// Routes to get products
// Get all available products
apiRoutes.route('/products').get(fetchProducts);

// Get a single product
apiRoutes.route('/product/:productSlug').get(fetchProduct);

// Routes to set up baskets
apiRoutes.route('/basket/:basketId').get(apiGetBasket);
apiRoutes.route('/basket').post(apiCreateBasket, apiGetBasket);
apiRoutes.route('/basket/:basketId').delete(apiDeleteBasket, apiCreateBasket, apiGetBasket);
apiRoutes.route('/basket/update/zone/:basketId').put(updateZoneBasket, apiGetBasket);
apiRoutes.route('/basket/update/quantity/:basketId').put(updateBasket, apiGetBasket);
apiRoutes.route('/basket/update/remove/:basketId').put(removeFromBasket, apiGetBasket);

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

export default apiRoutes;
