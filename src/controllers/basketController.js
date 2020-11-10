// Page Tag
// const tag = 'store-api:basketController';

// Requirements
// const debug = require('debug')(tag);
const { getBasketById, addBasket, updateBasketById } = require('./dbController')();

function basketController() {
  // Method to get a basket
  async function getBasket(req, res) {
    const { id } = req.params;
    const basket = await getBasketById(id);

    return res.json({
      status: 'ok',
      basket
    });
  }

  // Method to create an empty basket
  async function createBasket(req, res) {
    const basket = await addBasket();
    const { insertedId: id } = basket;

    return res.json({
      status: 'ok',
      id
    });
  }

  // Method to update a basket
  async function updateBasket(req, res, next) {
    const { id } = req.params;
    const { body } = req;

    await Promise.allSettled(body.map((product) => (
      updateBasketById(id, product.productId, parseInt(product.quantity, 10))
    )));
    next();
  }

  return {
    getBasket,
    createBasket,
    updateBasket
  };
}

module.exports = basketController;
