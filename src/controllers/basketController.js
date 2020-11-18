// Page Tag
const tag = 'store-api:basketController';

// Requirements
const debug = require('debug')(tag);
const {
  getBasketById,
  addBasket,
  updateBasketById,
  removeBasketById,
  removeItemFromBasket
} = require('./dbController');
const { getProductById } = require('./dbController');
const { calculateMoms } = require('../functions/helpers');

// Method to get a statement from a baskets items
function getStatement(items) {
  const bottomLine = items.reduce((acc, next) => ({
    totalMoms: acc.totalMoms + calculateMoms(next.quantity * next.grossPrice, next.momsRate),
    totalPrice: acc.totalPrice + next.linePrice
  }), {
    totalMoms: 0,
    totalPrice: 0
  });
  return { bottomLine };
}

async function getBasket(basketId) {
  const [basket] = await getBasketById(basketId);
  if (basket.length < 1) throw new Error();

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

  return {
    basketId: basket._id,
    items,
    statement: getStatement(items)
  };
}

async function createBasket() {
  const basket = await addBasket();
  return basket.insertedId;
}

// Method to get a basket
async function apiGetBasket(req, res) {
  const { basketId } = req.params;

  try {
    // DB Call
    const basket = await getBasket(basketId);
    return res.status(200).json({
      status: 'ok',
      basket
    });
  } catch {
    const newBasketId = await createBasket();
    const basket = await getBasket(newBasketId);
    return res.status(200).json({
      status: 'ok',
      basket
    });
  }
}

// Method to create an empty basket
async function apiCreateBasket(req, res, next) {
  const basketId = await createBasket();
  req.params.id = basketId;
  next();
}

// Method to update a basket
async function updateBasket(req, res, next) {
  const { basketId } = req.params;
  const { body } = req;

  await updateBasketById(basketId, body.productId, parseInt(body.quantity, 10));
  next();
}

// Method to remove an item from a basket
async function removeFromBasket(req, res, next) {
  const { basketId } = req.params;
  const { body } = req;

  await removeItemFromBasket(basketId, body.productId);
  next();
}

function apiDeleteBasket(req, res, next) {
  const { basketId } = req.params;
  removeBasketById(basketId);
  next();
}

module.exports = {
  getBasket,
  apiGetBasket,
  apiCreateBasket,
  apiDeleteBasket,
  updateBasket,
  removeFromBasket
};
