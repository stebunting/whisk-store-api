// Page Tag
const tag = 'store-api:productsController';

// Requirements
const debug = require('debug')(tag);
const { getProducts, getProductById } = require('./dbController');

// Convert _id field to productId
function mapProductsArray(products) {
  return products.map((product) => {
    const { _id: productId, ...rest } = product;
    return ({ productId, ...rest });
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
      products
    });
  } catch (error) {
    // Database Error
    return res.status(500).json({
      status: 'error'
    });
  }
}

// Route to fetch single product
async function fetchProduct(req, res) {
  const { productId } = req.params;

  try {
    // Make DB Call
    const data = await getProductById(productId);

    // Check a product has been returned
    if (data.length < 1) {
      return res.status(400).json({
        status: 'error'
      });
    }

    // Format product and return
    const product = mapProductsArray(data);
    return res.status(200).json({
      status: 'ok',
      product: product[0]
    });
  } catch (error) {
    // Database Error
    return res.status(500).json({
      status: 'error'
    });
  }
}

module.exports = { fetchProducts, fetchProduct };
