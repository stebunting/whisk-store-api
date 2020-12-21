// Requirements
import log from 'winston';
import Debug from 'debug';
import { NextFunction, Request, Response } from 'express-serve-static-core';

// Controllers
import {
  getProductBySlug,
  getBasketById,
  addBasket,
  updateBasketById,
  removeBasketById,
  removeItemFromBasket,
  updateBasketZone,
  cleanupBaskets
} from './dbController';
import { calculateMoms, parseDateCode } from '../functions/helpers';

// Types
import {
  Basket,
  BasketItem,
  DbBasket,
  BasketDelivery
} from '../types/Basket';
import { BottomLine } from '../types/Order';
import { Product } from '../types/Product';

// Page Tag
const tag = 'store-api:basketController';
const debug = Debug(tag);

// Method to get a statement from a baskets items
function getStatement(
  items: Array<BasketItem>, delivery: BasketDelivery
): { bottomLine: BottomLine } {
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
async function getItems(items: Array<BasketItem>): Promise<Array<BasketItem>> {
  const promises = [] as Array<Promise<Array<Product> | void>>;
  const newItems = [] as Array<BasketItem>;

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
function createDelivery(basket: DbBasket, items: Array<BasketItem>): BasketDelivery {
  const deliveryDataObject: any = {};
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
        deliveryCost: productDelivery && productDelivery.costs[basket.delivery.zone]
          ? productDelivery.costs[basket.delivery.zone].price
          : 0
      });
      deliveryDataObject[code].maxZone = Math.max(
        productDelivery ? productDelivery.maxZone : 0,
        deliveryDataObject[code].maxZone
      );
      deliveryDataObject[code].deliverable = deliveryDataObject[code].deliverable
        && productDelivery && productDelivery.maxZone >= basket.delivery.zone;
    }
  });

  // Loop over date codes in delivery object
  // Get lowest cost for each days delivery
  let deliveryTotal = 0;
  const deliveryDetails: any = Object.keys(deliveryDataObject).reduce((acc, date) => {
    // Get minimum price for each date
    const info = deliveryDataObject[date];
    const total = info.products.reduce((minimum: number, product: any) => {
      if (product.deliveryCost && product.deliveryCost < minimum) return product.deliveryCost;
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
  }, {} as { [key: string]: string });

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

async function getBasket(basketId: string): Promise<Basket> {
  // Get Basket from database by id
  const basketArray = await getBasketById(basketId);
  if (!basketArray || basketArray.length < 1) {
    log.error('Attempting to retrieve invalid basket from db', { metadata: { tag, basketId } });
    throw new Error('No such basket');
  }

  const basket = basketArray[0];
  let items = [] as Array<BasketItem>;
  try {
    items = await getItems(basket.items);
  } catch (error) {
    log.error('Could not get all products from basket', { metadata: { tag, error, basketId } });
  }
  const delivery = createDelivery(basket, items);
  const statement = getStatement(items, delivery);

  return {
    basketId: basket._id.toString(),
    items,
    delivery,
    statement
  };
}

async function createBasket(): Promise<string> {
  // Remove Baskets older than 7 days from db
  cleanupBaskets(7);

  const basket = await addBasket();
  return basket.insertedId.toString();
}

// Method to get a basket
async function apiGetBasket(req: Request, res: Response): Promise<Response> {
  const { basketId } = req.params;

  try {
    const basket = await getBasket(basketId);
    return res.status(200).json({
      status: 'ok',
      basket
    });
  } catch (error) {
    const newBasketId = await createBasket();
    const basket = await getBasket(newBasketId.toString());
    return res.status(200).json({
      status: 'ok',
      basket
    });
  }
}

// Method to create an empty basket
async function apiCreateBasket(
  req: Request, _res: Response, next?: NextFunction
): Promise<void> {
  const basketId = await createBasket();
  req.params.id = basketId;
  if (next) next();
}

// Method to update a basket
async function updateBasket(
  req: Request, _res: Response, next?: NextFunction
): Promise<void> {
  const { basketId } = req.params;
  const { body } = req;

  await removeItemFromBasket(basketId, body);
  await updateBasketById(basketId, body);
  if (next) next();
}

async function updateZoneBasket(
  req: Request, _res: Response, next?: NextFunction
): Promise<void> {
  const { basketId } = req.params;
  const { body } = req;

  await updateBasketZone(basketId, body.location);
  if (next) next();
}

// Method to remove an item from a basket
async function removeFromBasket(
  req: Request, _res: Response, next?: NextFunction
): Promise<void> {
  const { basketId } = req.params;
  const { body } = req;

  await removeItemFromBasket(basketId, body);
  if (next) next();
}

function apiDeleteBasket(
  req: Request, _res: Response, next?: NextFunction
): void {
  const { basketId } = req.params;
  removeBasketById(basketId);
  if (next) next();
}

export {
  getBasket,
  apiGetBasket,
  apiCreateBasket,
  apiDeleteBasket,
  updateBasket,
  updateZoneBasket,
  removeFromBasket
};
