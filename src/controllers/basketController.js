// Page Tag
const tag = 'store-api:basketController';

// Requirements
const debug = require('debug')(tag);
const { addBasket } = require('../controllers/dbController')();

function basketController() {
  async function createBasket(req, res) {
    const basket = await addBasket();
    const { insertedId: id } = basket;

    return res.json({
      status: 'ok',
      id
    });
  }

  return {
    createBasket
  };
}

module.exports = basketController;
