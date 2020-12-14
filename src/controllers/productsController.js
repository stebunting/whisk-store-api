// Page Tag
const tag = 'store-api:productsController';

// Requirements
const debug = require('debug')(tag);
const log = require('winston');
const {
  getProducts,
  getProductBySlug,
} = require('./dbController');

// Convert _id field to productId
function mapProductsArray(products) {
  return products.map((product) => {
    const { _id: productId, ...rest } = product;
    return { productId, ...rest };
  });
}

// Route to fetch all products
async function fetchProducts(req, res) {
  try {
    // Make DB Call
    const data = await getProducts();

    // Format product list and return
    const products = mapProductsArray(data);
    return res.status(200).json({
      status: 'ok',
      products,
    });
  } catch (error) {
    // Database Error
    log.error('Error fetching products from database', {
      metadata: { tag, error },
    });
    return res.status(500).json({
      status: 'error',
    });
  }
}

// Route to fetch single product
async function fetchProduct(req, res) {
  const { productSlug } = req.params;

  try {
    // Make DB Call
    const data = await getProductBySlug(productSlug);

    // Format product and return
    const products = mapProductsArray(data);
    return res.status(200).json({
      status: 'ok',
      products,
    });
  } catch (error) {
    // Database Error
    log.error('Error fetching product from database', {
      metadata: { tag, error },
    });
    return res.status(500).json({
      status: 'error',
    });
  }
}

module.exports = { fetchProducts, fetchProduct };
