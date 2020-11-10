// Page Tag
const tag = 'store-api:products';

// Requirements
const express = require('express');
const debug = require('debug')(tag);
const { fetchProducts, fetchProduct } = require('../controllers/productsController')();
const { getBasket, createBasket } = require('../controllers/basketController')();

function routes() {
  const apiRoutes = express.Router();

  apiRoutes.route('/products').get(fetchProducts);
  apiRoutes.route('/product/:id').get(fetchProduct);

  apiRoutes.route('/basket/:id').get(getBasket);
  apiRoutes.route('/basket').post(createBasket);

  return apiRoutes;
}

module.exports = routes;
