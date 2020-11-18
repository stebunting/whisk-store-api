// Page Tag
const tag = 'store-api:orderController';

// Requirements
const Swish = require('swish-merchant');
const debug = require('debug')(tag);
const { priceFormat } = require('../functions/helpers');
const { getBasket } = require('./basketController');
const {
  removeBasketById,
  addOrder,
  getSwishStatus,
  updateSwishPayment
} = require('./dbController');
const { sendConfirmationEmail } = require('./emailController');
const status = require('./orderStatuses');

const swish = new Swish({
  alias: process.env.SWISH_ALIAS,
  paymentRequestCallback: `${process.env.SWISH_CALLBACK}/api/order/swish/callback`,
  cert: JSON.parse(`"${process.env.SWISH_CERT}"`),
  key: JSON.parse(`"${process.env.SWISH_KEY}"`),
  ca: JSON.parse(`"${process.env.SWISH_CA}"`),
  password: 'swish'
});
swish.url = 'https://mss.cpc.getswish.net/swish-cpcapi';

function orderController() {
  function parseOrder(orderBody, basket) {
    let order = {
      details: {
        name: orderBody.name,
        email: orderBody.email,
        telephone: orderBody.telephone
      },
      delivery: {
        type: orderBody.deliveryType,
        date: orderBody.date
      },
      items: basket.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        grossPrice: item.grossPrice,
        momsRate: item.momsRate,
        quantity: item.quantity
      })),
      bottomLine: basket.statement.bottomLine,
      payment: {
        method: orderBody.paymentMethod,
        status: status.NOT_ORDERED
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
    const { date: friendlyDate } = body;

    // VERIFY ORDER

    // Payment Link
    if (order.payment.method === 'paymentLink') {
      order.payment.status = status.CREATED;
      await Promise.allSettled([
        addOrder(order),
        removeBasketById(basketId)
      ]);

      sendConfirmationEmail(order, friendlyDate);

      return res.json({
        status: 'ok',
        order: {
          status: status.PAID,
          paymentMethod: order.payment.method,
        }
      });
    }

    // Swish Payment
    if (order.payment.method === 'swish') {
      try {
        const response = await swish.createPaymentRequest({
          phoneNumber: order.details.telephone,
          amount: priceFormat(order.bottomLine.totalPrice, { includeSymbol: false }),
          message: 'BE18'
        });
        const { id: swishId } = response;
        order.payment = {
          ...order.payment,
          status: status.CREATED,
          swish: {
            id: swishId,
            status: status.CREATED
          }
        };
        await addOrder(order);

        return res.json({
          status: 'ok',
          order: {
            status: order.payment.status,
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

  function swishCallback(req, res) {
    const { body } = req;
    updateSwishPayment(body);
    return res.json({ status: 'thanks very much' });
  }

  return {
    createOrder,
    checkPaymentStatus,
    swishCallback
  };
}

module.exports = orderController;
