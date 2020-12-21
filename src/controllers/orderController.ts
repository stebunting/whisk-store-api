// Requirements
import Debug from 'debug';
import { NextFunction, Request, Response } from 'express-serve-static-core';

// Types
import { Order } from 'src/types/Order';
import { Basket } from '../types/Basket';
import status from './orderStatuses';

// Controllers
import { sendConfirmationEmail } from './emailController';
import { priceFormat } from '../functions/helpers';
import {
  addOrder,
  getSwishStatus,
  updateSwishPayment,
  updateSwishRefund,
  updateOrder,
  removeOrder,
  getAllOrders,
  getOrderById
} from './dbController';
import { getBasket } from './basketController';

// Types
import { SwishRefundPayload } from 'src/types/SwishRefundPayload';
import { SwishPayload } from 'src/types/SwishPayload';

// Page Tag
const tag = 'store-api:orderController';
const debug = Debug(tag);

// Requirements
const Swish = require('swish-merchant');

const production = {
  alias: process.env.SWISH_ALIAS,
  cert: JSON.parse(`"${process.env.SWISH_CERT}"`),
  key: JSON.parse(`"${process.env.SWISH_KEY}"`)
};

// const test = {
//   alias: process.env.TEST_SWISH_ALIAS,
//   cert: JSON.parse(`"${process.env.TEST_SWISH_CERT}"`),
//   key: JSON.parse(`"${process.env.TEST_SWISH_KEY}"`),
//   ca: JSON.parse(`"${process.env.TEST_SWISH_CA}"`),
//   password: 'swish',
//   test: true
// };

const swish = new Swish({
  ...production,
  paymentRequestCallback: `${process.env.SWISH_CALLBACK}/api/order/swish/paymentCallback`,
  refundRequestCallback: `${process.env.SWISH_CALLBACK}/api/order/swish/refundCallback`
});

async function getOrders(req: Request, res: Response): Promise<Response> {
  try {
    const orders = await getAllOrders();
    return res.status(200).json({ status: 'ok', orders });
  } catch (error) {
    return res.status(400).json({ status: 'error' });
  }
}

async function getOrder(req: Request, res: Response): Promise<Response> {
  const { orderId } = req.params;

  try {
    const order = await getOrderById(orderId);
    return res.status(200).json({ status: 'ok', order: order.length > 0 ? order[0] : null });
  } catch (error) {
    return res.status(400).json({ status: 'error' });
  }
}

interface OrderBody {
  name: string,
  email: string,
  telephone: string,
  address: string,
  notes: string,
  paymentMethod: string,
  deliveryType: 'delivery' | 'collection' | 'email',
  zone: string,
  deliveryNotes: string
}

function parseOrder(orderBody: OrderBody, basket: Basket): Order {
  return {
    details: {
      name: orderBody.name,
      email: orderBody.email,
      telephone: orderBody.telephone,
      address: orderBody.address,
      notes: orderBody.notes
    },
    delivery: Object.keys(basket.delivery.details).map((key) => ({
      date: key,
      products: basket.delivery.details[key].products,
      totalPrice: basket.delivery.details[key].total
    })),
    items: basket.items.map((item) => ({
      productSlug: item.productSlug,
      name: item.name,
      quantity: item.quantity,
      grossPrice: item.grossPrice,
      momsRate: item.momsRate,
      deliveryType: item.deliveryType,
      deliveryDate: item.deliveryDate
    })),
    bottomLine: basket.statement.bottomLine,
    payment: orderBody.paymentMethod === 'swish' ? {
      method: 'swish',
      status: status.NOT_ORDERED,
      confirmationEmailSent: false,
      refunds: [] as SwishRefundPayload[],
      swish: {} as SwishPayload
    } : {
      method: 'paymentLink',
      status: status.NOT_ORDERED,
      confirmationEmailSent: false
    }
  };

  // IS THIS RELEVANT??????
  // switch (orderBody.deliveryType) {
  //   case 'delivery': {
  //     order = {
  //       ...order,
  //       delivery: {
  //         ...order.delivery,
  //         address: orderBody.address,
  //         zone: orderBody.zone,
  //         deliveryNotes: orderBody.deliveryNotes
  //       }
  //     };
  //     break;
  //   }

  //   default:
  //     break;
  // }
}

async function createOrder(req: Request, res: Response): Promise<Response> {
  const { basketId } = req.params;
  const { body } = req;

  let basket = {} as Basket;
  try {
    basket = await getBasket(basketId);
  } catch (error) {
    debug(error);
  }

  const order = parseOrder(body, basket);
  // VERIFY ORDER

  // Payment Link
  if (order.payment.method === 'paymentLink') {
    order.payment.status = status.CREATED;

    const response = await addOrder(order);
    const orderId = response.insertedId.toString();

    sendConfirmationEmail(order)
      .then((emailSent) => updateOrder(
        orderId,
        { $set: { 'payment.confirmationEmailSent': emailSent } }
      ));

    return res.json({
      status: 'ok',
      order: {
        orderId,
        status: status.PAID,
        paymentMethod: order.payment.method,
      }
    });
  }

  // Swish Payment
  if (order.payment.method === 'swish') {
    let orderId = '';
    let swishId: string;
    try {
      const orderResponse = await addOrder(order);
      orderId = orderResponse.insertedId.toString();

      const response = await swish.createPaymentRequest({
        phoneNumber: order.details.telephone,
        amount: priceFormat(order.bottomLine.totalPrice, { includeSymbol: false }),
        payeePaymentReference: orderId.toString(),
        message: ''
      });
      swishId = response.id;
    } catch (error) {
      // If Swish Payment fails, remove order
      if (orderId) removeOrder(orderId);

      return res.json({
        status: 'ok',
        order: {
          status: 'ERROR',
          ...error.errors[0]
        }
      });
    }

    try {
      await updateOrder(orderId, {
        $set: {
          'payment.refunds': [],
          'payment.status': status.CREATED,
          'payment.swish': {
            id: swishId,
            status: status.CREATED
          }
        }
      });

      return res.json({
        status: 'ok',
        order: {
          status: status.CREATED,
          id: swishId,
          paymentMethod: order.payment.method
        }
      });
    } catch (error) {
      return res.json({
        status: 'ok',
        order: {
          status: 'ERROR',
          ...error.errors[0]
        }
      });
    }
  } else {
    return res.json({ status: 'error' });
  }
}

async function checkPaymentStatus(req: Request, res: Response): Promise<Response> {
  const { swishId } = req.params;
  const response = await getSwishStatus(swishId);
  return res.json({
    status: 'ok',
    order: {
      ...response[0],
      paymentMethod: 'swish'
    }
  });
}

// Swish Callback Function
async function swishPaymentCallback(req: Request, res: Response): Promise<Response> {
  const { body } = req;
  const { payeePaymentReference: orderId } = body;

  // Update Swish Payment
  updateSwishPayment(body)
    // Get Order
    .then(() => getOrderById(orderId)
      .then(([order]) => {
        if (body.status === 'PAID' && !order.payment.confirmationEmailSent) {
          // Send Email
          return sendConfirmationEmail(order)
            // Update Success Order Status
            .then((emailSent) => updateOrder(
              orderId, {
                $set: {
                  'payment.status': body.status,
                  'payment.confirmationEmailSent': emailSent
                }
              }
            ));
        }
        // Update Non-Success Order Status
        return updateOrder(orderId, {
          $set: {
            'payment.status': body.status
          }
        });
      }))
    .catch((error) => debug(error));
  return res.status(200).json({ status: 'thanks very much' });
}

async function setStatus(req: Request, res: Response): Promise<Response> {
  const { body } = req;
  if (!('orderId' in body) || !('status' in body)) {
    return res.status(400).json({ status: 'error' });
  }

  await updateOrder(body.orderId, {
    $set: {
      'payment.status': body.status
    }
  });
  const orders = await getOrderById(body.orderId);
  if (orders.length > 0) {
    return res.status(200).json({ status: 'ok', order: orders[0] });
  }
  return res.status(400).json({ status: 'error' });
}

// Function to check refund status
async function checkRefund(refundId: string) {
  try {
    const response = await swish.retrieveRefundRequest({
      id: refundId
    });
    await updateSwishRefund(response.data);
    return response.data;
  } catch (error) {
    debug(error.errors);
  }
  return null;
}

// Function to start a refund
async function sendRefund(
  req: Request, res: Response, next?: NextFunction
): Promise<Response | void> {
  const { body } = req;
  if (!body.orderId || !body.amount) {
    return res.status(200).json({ status: 'error' });
  }

  const { orderId, amount } = body;
  const orderArray = await getOrderById(orderId);

  // Order Not Found
  if (orderArray.length < 1) {
    return res.status(200).json({ status: 'error' });
  }

  const [order] = orderArray;

  // Non Swish Order
  if (order.payment.method !== 'swish') {
    return res.status(200).json({ status: 'error' });
  }

  const { paymentReference: originalPaymentReference } = order.payment.swish;
  let refundId = '';
  try {
    const response = await swish.createRefundRequest({
      originalPaymentReference,
      amount,
      payerPaymentReference: orderId
    });
    refundId = response.id;
    await updateOrder(orderId, {
      $push: {
        'payment.refunds': { id: refundId }
      }
    });
  } catch (error) {
    debug(error.errors);
  }
  req.params.refundId = refundId;

  return (next)
    ? next()
    : res.status(200).json({ status: 'error' });
}

// Swish Refund Callback Function
async function swishRefundCallback(req: Request, res: Response): Promise<Response> {
  updateSwishRefund(req.body);
  return res.status(200).json({ status: 'thanks very much' });
}

async function apiCheckRefund(
  req: Request, res: Response, next?: NextFunction
): Promise<Response | void> {
  const { refundId } = req.params;

  try {
    const response = await checkRefund(refundId);
    req.params.orderId = response.payerPaymentReference;
  } catch (error) {
    debug(error.errors);
    return res.status(400).json({ status: 'error' });
  }

  return (next)
    ? next()
    : res.status(200).json({ status: 'error' });
}

export {
  getOrders,
  getOrder,
  createOrder,
  checkPaymentStatus,
  swishPaymentCallback,
  swishRefundCallback,
  setStatus,
  sendRefund,
  apiCheckRefund
};
