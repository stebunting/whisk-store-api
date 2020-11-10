// Page Tag
const tag = 'store-api:basketController';

// Requirements
const debug = require('debug')(tag);
const { getBasketById, addBasket } = require('../controllers/dbController')();

function basketController() {
  async function getBasket(req, res) {
    const { id } = req.params;
    const basket = await getBasketById(id);

    return res.json({
      status: 'ok',
      basket
    });
  }

  async function createBasket(req, res) {
    const basket = await addBasket();
    const { insertedId: id } = basket;

    return res.json({
      status: 'ok',
      id
    });
  }

  return {
    getBasket,
    createBasket
  };
}

module.exports = basketController;
