// Page Tag
// const tag = 'store-api:productsController';

// Requirements
// const debug = require('debug')(tag);
const { getProducts, getProductById } = require('./dbController')();

function productsController() {
  async function fetchProducts(req, res) {
    const products = await getProducts();
    return res.json({
      status: 'ok',
      products
    });
  }

  async function fetchProduct(req, res) {
    const { id } = req.params;

    const product = await getProductById(id);
    if (product.length < 1) {
      return res.json({
        status: 'error'
      });
    }
    return res.json({
      status: 'ok',
      product: product[0]
    });
  }

  return {
    fetchProducts,
    fetchProduct
  };
}

module.exports = productsController;
