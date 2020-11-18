// Page Tag
const tag = 'store-api:basketController';

// Requirements
const debug = require('debug')(tag);
const {
  getBasketById,
  addBasket,
  updateBasketById,
  removeBasketById,
  removeItemFromBasket,
  updateBasketZone
} = require('./dbController');
const { getProductById } = require('./dbController');
const { calculateMoms } = require('../functions/helpers');

// Method to get a statement from a baskets items
function getStatement(items, delivery) {
  const deliveryMoms = calculateMoms(delivery.price, delivery.momsRate) || 0;
  const bottomLine = items.reduce((acc, next) => ({
    ...acc,
    totalMoms: acc.totalMoms + calculateMoms(next.quantity * next.grossPrice, next.momsRate),
    totalPrice: acc.totalDelivery + acc.totalPrice + next.linePrice
  }), {
    totalDelivery: delivery.price || 0,
    totalMoms: deliveryMoms,
    totalPrice: 0
  });
  return { bottomLine };
}

function getDelivery(zone, items) {
  if (items.length === 0 || zone < 0 || zone > 2) {
    return 0;
  }
  const minCostDetails = items.reduce((minimum, item) => {
    const details = item.delivery.costs[zone];
    if (details.price < minimum.price) return details;
    return minimum;
  }, items[0].delivery.costs[zone]);
  return minCostDetails;
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

  const deliverable = basket.delivery.zone >= 0
    && items.reduce((acc, item) => (
      acc && basket.delivery.zone <= item.delivery.maxZone
    ), true);

  const delivery = {
    ...basket.delivery,
    ...getDelivery(basket.delivery.zone, items),
    deliverable
  };

  return {
    basketId: basket._id,
    items,
    delivery,
    statement: getStatement(items, delivery)
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

async function updateZoneBasket(req, res, next) {
  const { basketId } = req.params;
  const { body } = req;

  await updateBasketZone(basketId, body.location);
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
  updateZoneBasket,
  removeFromBasket
};
