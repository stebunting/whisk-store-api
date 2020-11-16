// Page Tag
const tag = 'store-api:productsController';

// Requirements
const debug = require('debug')(tag);
const { getProducts, getProductById } = require('./dbController')();

function productsController() {
  function mapProductsArray(products) {
    return products.map((product) => {
      const { _id: productId, ...rest } = product;
      return ({ productId, ...rest });
    });
  }

  async function fetchProducts(req, res) {
    const data = await getProducts();
    const products = mapProductsArray(data);

    return res.json({
      status: 'ok',
      products
    });
  }

  async function fetchProduct(req, res) {
    const { id } = req.params;

    const data = await getProductById(id);
    if (data.length < 1) {
      return res.json({
        status: 'error'
      });
    }

    const product = mapProductsArray(data);
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
