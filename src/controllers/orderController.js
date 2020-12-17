// Page Tag
const tag = 'store-api:orderController';

// Requirements
const Swish = require('swish-merchant');
const debug = require('debug')(tag);
const { priceFormat } = require('../functions/helpers');
const { getBasket } = require('./basketController');
const {
  addOrder,
  getSwishStatus,
  updateSwishPayment,
  updateSwishRefund,
  updateOrder,
  getAllOrders,
  getOrderById
} = require('./dbController');
const { sendConfirmationEmail } = require('./emailController');
const status = require('./orderStatuses');

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

function orderController() {
  async function getOrders(req, res) {
    try {
      const orders = await getAllOrders();
      return res.status(200).json({ status: 'ok', orders });
    } catch (error) {
      return res.status(400).json({ status: 'error' });
    }
  }

  async function getOrder(req, res) {
    const { orderId } = req.params;

    try {
      const order = await getOrderById(orderId);
      return res.status(200).json({ status: 'ok', order: order.length > 0 ? order[0] : null });
    } catch (error) {
      return res.status(400).json({ status: 'error' });
    }
  }

  function parseOrder(orderBody, basket) {
    let order = {
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
        grossPrice: item.grossPrice,
        momsRate: item.momsRate,
        quantity: item.quantity,
        deliveryType: item.deliveryType,
        deliveryDate: item.deliveryDate
      })),
      bottomLine: basket.statement.bottomLine,
      payment: {
        method: orderBody.paymentMethod,
        status: status.NOT_ORDERED,
        confirmationEmailSent: false
      }
    };

    switch (orderBody.deliveryType) {
      case 'delivery': {
        order = {
          ...order,
          delivery: {
            ...order.delivery,
            address: orderBody.address,
            zone: orderBody.zone,
            deliveryNotes: orderBody.deliveryNotes
          }
        };
        break;
      }

      default:
        break;
    }

    return order;
  }

  async function createOrder(req, res) {
    const { basketId } = req.params;
    const { body } = req;

    let basket;
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
      const { insertedId: orderId } = response;

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
      try {
        const orderResponse = await addOrder(order);
        const { insertedId: orderId } = orderResponse;

        const response = await swish.createPaymentRequest({
          phoneNumber: order.details.telephone,
          amount: priceFormat(order.bottomLine.totalPrice, { includeSymbol: false }),
          payeePaymentReference: orderId.toString(),
          message: ''
        });
        const { id: swishId } = response;

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
            paymentMethod: order.payment.payment
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

  async function checkPaymentStatus(req, res) {
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
  async function swishPaymentCallback(req, res) {
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

  async function setStatus(req, res) {
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
  async function checkRefund(refundId) {
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
  async function sendRefund(req, res, next) {
    const { body } = req;
    if (!body.orderId || !body.amount) {
      // INVALID ORDER
    }

    const { orderId, amount } = body;
    let order = await getOrderById(orderId);
    if (order.length < 1) {
      // Invalid order
    } else {
      [order] = order;
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
    next();
  }

  // Swish Refund Callback Function
  async function swishRefundCallback(req, res) {
    updateSwishRefund(req.body);
    return res.status(200).json({ status: 'thanks very much' });
  }

  async function apiCheckRefund(req, res, next) {
    const { refundId } = req.params;

    try {
      const response = await checkRefund(refundId);
      req.params.orderId = response.payerPaymentReference;
    } catch (error) {
      debug(error.errors);
      return res.status(400).json({ status: 'error' });
    }
    return next();
  }

  return {
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
}

module.exports = orderController;
