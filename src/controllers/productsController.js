// Page Tag
const tag = 'store-api:productsController';

// Requirements
const debug = require('debug')(tag);
const { getProducts } = require('../controllers/dbController')();

function productsController() {
  async function fetchProducts(req, res) {
    const products = await getProducts();
    return res.json({ status: 'ok' });
  }

  return {
    fetchProducts
  };
}

module.exports = productsController;
