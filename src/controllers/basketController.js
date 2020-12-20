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

// Add product information for each item in basket to item.details
async function getItems(items) {
  const promises = [];
  const newItems = [];

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];

    promises.push(getProductBySlug(item.productSlug)
      .then((product) => {
        if (product.length > 0) {
          const [details] = product;
          newItems[i] = {
            ...item,
            details,
            name: details.name,
            linePrice: item.quantity * details.grossPrice,
            momsRate: details.momsRate,
            grossPrice: details.grossPrice
          };
        } else {
          throw Error('Got 0 length array while getting all products from basket');
        }
      }).catch((error) => {
        throw error;
      }));
  }
  await Promise.all(promises);
  return newItems;
}

// Method to create delivery and items object from basket
function createDelivery(basket, items) {
  const deliveryDataObject = {};
  let deliveryRequired = false;

  items.forEach((item) => {
    if (item.deliveryType === 'delivery') {
      deliveryRequired = true;

      // Get date code and create details for this date if necessary
      const { code } = parseDateCode(item.deliveryDate);
      if (!deliveryDataObject[code]) {
        deliveryDataObject[code] = {
          products: [],
          maxZone: 0,
          deliverable: true
        };
      }

      // Add new product object for this item and update fields
      const productDelivery = item.details.delivery;
      deliveryDataObject[code].products.push({
        slug: item.details.slug,
        quantity: item.quantity,
        deliveryCost: productDelivery.costs[basket.delivery.zone]
          ? productDelivery.costs[basket.delivery.zone].price
          : 0
      });
      deliveryDataObject[code].maxZone = Math.max(
        productDelivery.maxZone,
        deliveryDataObject[code].maxZone
      );
      deliveryDataObject[code].deliverable = deliveryDataObject[code].deliverable
        && productDelivery.maxZone >= basket.delivery.zone;
    }
  });

  // Loop over date codes in delivery object
  // Get lowest cost for each days delivery
  let deliveryTotal = 0;
  const deliveryDetails = Object.keys(deliveryDataObject).reduce((acc, date) => {
    // Get minimum price for each date
    const info = deliveryDataObject[date];
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

  return {
    ...basket.delivery,
    deliveryRequired,
    details: deliveryDetails,
    deliverable: Object.keys(deliveryDataObject).length > 0 && Object.keys(deliveryDataObject)
      .reduce((acc, key) => acc && deliveryDataObject[key].deliverable, true),
    momsRate: 25,
    deliveryTotal,
  };
}

async function getBasket(basketId) {
  // Get Basket from database by id
  let basket = await getBasketById(basketId);
  if (!basket || basket.length < 1) {
    log.error('Attempting to retrieve invalid basket from db', { metadata: { tag, basketId } });
    throw new Error('No such basket');
  }

  [basket] = basket;
  let items;
  try {
    items = await getItems(basket.items);
  } catch (error) {
    log.error('Could not get all products from basket', { metadata: { tag, error, basketId } });
  }
  const delivery = createDelivery(basket, items);
  const statement = getStatement(items, delivery);

  return {
    basketId: basket._id,
    items,
    delivery,
    statement
  };
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
async function apiCreateBasket(req, _res, next) {
  const basketId = await createBasket();
  req.params.id = basketId;
  next();
}

// Method to update a basket
async function updateBasket(req, _res, next) {
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
async function removeFromBasket(req, _res, next) {
  const { basketId } = req.params;
  const { body } = req;

  await removeItemFromBasket(basketId, body);
  next();
}

function apiDeleteBasket(req, _res, next) {
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
