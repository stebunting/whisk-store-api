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
const { calculateMoms, parseDateCode } = require('../functions/helpers');

// Method to get a statement from a baskets items
function getStatement(items, delivery) {
  const deliveryMoms = calculateMoms(delivery.deliveryTotal, delivery.momsRate) || 0;
  const bottomLine = items.reduce((acc, next) => ({
    ...acc,
    totalMoms: acc.totalMoms + calculateMoms(next.quantity * next.grossPrice, next.momsRate),
    totalPrice: acc.totalDelivery + acc.totalPrice + next.linePrice
  }), {
    totalDelivery: delivery.deliveryTotal || 0,
    totalMoms: deliveryMoms,
    totalPrice: 0
  });
  return { bottomLine };
}

async function getBasket(basketId) {
  const [basket] = await getBasketById(basketId);
  if (!basket || basket.length < 1) throw new Error();
  
  const products = await Promise.allSettled(
    basket.items.map((item) => getProductById(item.productId))
  );

  const delivery = {};
  let allCollections = true;
  const items = basket.items.map((item, index) => {
    const response = products[index];
    if (response.status !== 'fulfilled' || response.value.length < 1) {
      return item;
    }
    const [product] = response.value;

    // Delivery
    if (item.deliveryType === 'delivery') {
      const { year, month, date } = parseDateCode(item.deliveryDate);
      const code = `${year}-${month}-${date}`;
      if (!delivery[code]) {
        delivery[code] = {
          products: [],
          maxZone: 0,
          deliverable: true
        };
      }
      delivery[code].products.push({
        productId: item.productId,
        quantity: item.quantity,
        deliveryCost: product.delivery.costs[basket.delivery.zone]
          ? product.delivery.costs[basket.delivery.zone].price
          : 0
      });
      delivery[code].maxZone = Math.max(product.delivery.maxZone, delivery[code].maxZone);
      delivery[code].deliverable = delivery[code].deliverable
        && product.delivery.maxZone >= basket.delivery.zone;
    }
    allCollections = allCollections && item.deliveryType !== 'delivery';

    return {
      ...item,
      name: product.name,
      details: product,
      linePrice: item.quantity * product.grossPrice,
      momsRate: product.momsRate,
      grossPrice: product.grossPrice
    };
  });

  // Get cost for each days delivery
  let deliveryTotal = 0;
  const deliveryDetails = Object.keys(delivery).reduce((acc, date) => {
    const info = delivery[date];
    const total = info.products.reduce((minimum, product) => {
      if (product.deliveryCost < minimum) return product.deliveryCost;
      return minimum;
    }, info.products[0].deliveryCost);
    acc[date] = {
      ...info,
      momsRate: 25,
      total
    };
    deliveryTotal += total;
    return acc;
  }, {});

  const deliveryObject = {
    ...basket.delivery,
    allCollections,
    details: deliveryDetails,
    deliverable: Object.keys(delivery).length > 0
      && Object.keys(delivery).reduce((acc, key) => acc && delivery[key].deliverable, true),
    momsRate: 25,
    deliveryTotal,
  };

  const b = {
    ...basket,
    basketId: basket._id,
    items,
    delivery: deliveryObject,
    statement: getStatement(items, deliveryObject)
  };
  return b;
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
  } catch (error) {
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

  await removeItemFromBasket(basketId, body);
  await updateBasketById(basketId, body);
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

  await removeItemFromBasket(basketId, body);
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
