// Page Tag
const tag = 'store-api:basketController';

// Requirements
const debug = require('debug')(tag);
const { getBasketById, addBasket, updateBasketById } = require('./dbController')();
const { getProductById } = require('./dbController')();

function basketController() {
  // Method to get a basket
  async function getBasket(req, res) {
    const { id } = req.params;
    let [basket] = await getBasketById(id);

    if (basket.length < 1) {
      return res.json({
        status: 'error'
      });
    }

    const response = await Promise.allSettled(
      Object.keys(basket.items).map((key) => getProductById(key))
    );
    basket = {
      basketId: basket._id,
      items: response.map((item) => {
        if (item.status === 'fulfilled') {
          const [{ _id: productId, ...details }] = item.value;
          return {
            productId,
            ...details,
            quantity: basket.items[productId]
          };
        }
        return {};
      })
    };

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

    await updateBasketById(id, body.productId, parseInt(body.quantity, 10));
    next();
  }

  return {
    getBasket,
    createBasket,
    updateBasket
  };
}

module.exports = basketController;
