// Page Tag
const tag = 'store-api:basketController';

// Requirements
const debug = require('debug')(tag);
const { getBasketById, addBasket, updateBasketById } = require('./dbController')();
const { getProductById } = require('./dbController')();
const { calculateMoms } = require('../functions/helpers');

function basketController() {
  // Method to get a statement from a baskets items
  function getStatement(items) {
    const bottomLine = items.reduce((acc, next) => ({
      totalMoms: acc.totalMoms + calculateMoms(next.grossPrice, next.momsRate),
      totalPrice: acc.totalPrice + next.linePrice
    }), {
      totalMoms: 0,
      totalPrice: 0
    });
    return { bottomLine };
  }

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
    const items = response.map((item) => {
      if (item.status === 'fulfilled') {
        const [{ _id: productId, ...details }] = item.value;
        const quantity = basket.items[productId];
        return {
          productId,
          ...details,
          quantity,
          linePrice: details.grossPrice * quantity
        };
      }
      return {};
    });

    basket = {
      basketId: basket._id,
      items,
      statement: getStatement(items)
    };
    debug(basket);

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
