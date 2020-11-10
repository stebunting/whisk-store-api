// Page Tag
const tag = 'store-api:products';

// Requirements
const express = require('express');
const debug = require('debug')(tag);
const { fetchProducts } = require('../controllers/productsController')();

function routes() {
  const apiRoutes = express.Router();

  apiRoutes.route('/products')
    .get(fetchProducts);

  return apiRoutes;
}

module.exports = routes;
