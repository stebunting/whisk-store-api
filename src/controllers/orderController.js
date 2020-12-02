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
  updateOrder,
  getAllOrders,
  getOrderById
} = require('./dbController');
const { sendConfirmationEmail } = require('./emailController');
const status = require('./orderStatuses');

const swish = new Swish({
  alias: process.env.SWISH_ALIAS,
  paymentRequestCallback: `${process.env.SWISH_CALLBACK}/api/order/swish/callback`,
  cert: JSON.parse(`"${process.env.SWISH_CERT}"`),
  key: JSON.parse(`"${process.env.SWISH_KEY}"`)
});

function orderController() {
  async function getOrders(req, res) {
    const orders = await getAllOrders();
    return res.json(orders);
  }

  function parseOrder(orderBody, basket) {
    let order = {
      details: {
        name: orderBody.name,
        email: orderBody.email,
        telephone: orderBody.telephone,
        notes: orderBody.notes
      },
      delivery: Object.keys(basket.delivery.details).map((key) => ({
        date: key,
        products: basket.delivery.details[key].products,
        totalPrice: basket.delivery.details[key].total
      })),
      items: basket.items.map((item) => ({
        productId: item.productId,
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
          { 'payment.confirmationEmailSent': emailSent }
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
          'payment.status': status.CREATED,
          'payment.swish': {
            id: swishId,
            status: status.CREATED
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
  async function swishCallback(req, res) {
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
                orderId,
                {
                  'payment.status': body.status,
                  'payment.confirmationEmailSent': emailSent
                }
              ));
          }
          // Update Non-Success Order Status
          return updateOrder(orderId, { 'payment.status': body.status });
        }))
      .catch((error) => debug(error));
    return res.status(200).json({ status: 'thanks very much' });
  }

  return {
    getOrders,
    createOrder,
    checkPaymentStatus,
    swishCallback
  };
}

module.exports = orderController;
