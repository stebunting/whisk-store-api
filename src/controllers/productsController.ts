// Requirements
import log from 'winston';
import Debug from 'debug';
import { Request, Response } from 'express';

// Types
import { Product } from 'src/types/Product';

// Controllers
import { getProducts, getProductBySlug } from './dbController';

// Page Tag
const tag = 'store-api:productsController';
const debug = Debug(tag);

// Convert _id field to productId
function mapProductsArray(products: Array<Product>) {
  return products.map((product) => {
    const { _id: productId, ...rest } = product;
    return { ...rest, productId };
  });
}

// Route to fetch all products
async function fetchProducts(_req: Request, res: Response): Promise<Response> {
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
async function fetchProduct(req: Request, res: Response): Promise<Response> {
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

export { fetchProducts, fetchProduct };
