// Page Tag
const tag = 'store-api:basketController';

// Requirements
const log = require('winston');
const debug = require('debug')(tag);
const {
  getBasketById,
  addBasket,
  updateBasketById,
  removeBasketById,
  removeItemFromBasket,
  updateBasketZone,
  cleanupBaskets
} = require('./dbController');
const { getProductBySlug } = require('./dbController');
const { calculateMoms, parseDateCode } = require('../functions/helpers');

// Method to get a statement from a baskets items
function getStatement(items, delivery) {
  const deliveryMoms = calculateMoms(delivery.deliveryTotal, delivery.momsRate) || 0;
  const bottomLine = items.reduce((acc, next) => ({
    ...acc,
    totalMoms: acc.totalMoms + calculateMoms(next.quantity * next.grossPrice, next.momsRate),
    totalPrice: acc.totalPrice + next.linePrice
  }), {
    totalDelivery: delivery.deliveryTotal || 0,
    totalMoms: deliveryMoms,
    totalPrice: delivery.deliveryTotal || 0
  });
  return { bottomLine };
}

async function getBasket(basketId) {
  // Get Basket from database by id
  let basket = await getBasketById(basketId);
  if (!basket || basket.length < 1) {
    log.error('Attempting to retrieve invalid basket from db', { metadata: { tag, basketId } });
    throw new Error('No such basket');
  } else {
    [basket] = basket;
  }

  // Add product information for each item in basket to item.details
  const promises = [];
  for (let i = 0; i < basket.items.length; i += 1) {
    promises.push(getProductBySlug(basket.items[i].productSlug)
      .then((product) => {
        if (product.length > 0) {
          [basket.items[i].details] = product;
        } else {
          throw Error('Got 0 length array while getting all products from basket');
        }
      }).catch((error) => {
        log.error('Could not get all products from basket', { metadata: { tag, error, basketId } });
        throw error;
      }));
  }
  await Promise.all(promises);

  // Create delivery object for each item
  const delivery = {};
  let deliveryRequired = false;
  const items = basket.items.map((item) => {
    if (item.deliveryType === 'delivery') {
      deliveryRequired = true;

      // Get date code and create details for this date if necessary
      const { code } = parseDateCode(item.deliveryDate);
      if (!delivery[code]) {
        delivery[code] = {
          products: [],
          maxZone: 0,
          deliverable: true
        };
      }

      // Add new product object for this item and update fields
      const productDelivery = item.details.delivery;
      delivery[code].products.push({
        slug: item.details.slug,
        quantity: item.quantity,
        deliveryCost: productDelivery.costs[basket.delivery.zone]
          ? productDelivery.costs[basket.delivery.zone].price
          : 0
      });
      delivery[code].maxZone = Math.max(productDelivery.maxZone, delivery[code].maxZone);
      delivery[code].deliverable = delivery[code].deliverable
        && productDelivery.maxZone >= basket.delivery.zone;
    }

    return {
      ...item,
      name: item.details.name,
      linePrice: item.quantity * item.details.grossPrice,
      momsRate: item.details.momsRate,
      grossPrice: item.details.grossPrice
    };
  });

  // Loop over date codes in delivery object
  // Get lowest cost for each days delivery
  let deliveryTotal = 0;
  const deliveryDetails = Object.keys(delivery).reduce((acc, date) => {
    // Get minimum price for each date
    const info = delivery[date];
    const total = info.products.reduce((minimum, product) => {
      if (product.deliveryCost < minimum) return product.deliveryCost;
      return minimum;
    }, info.products[0].deliveryCost);

    // Add data to accumulator, reduce products to single object
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
    deliveryRequired,
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
  // Remove Baskets older than 7 days from db
  cleanupBaskets(7);

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
