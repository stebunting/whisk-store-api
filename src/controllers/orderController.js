// Page Tag
const tag = 'store-api:orderController';

// Requirements
const Swish = require('swish-merchant');
const debug = require('debug')(tag);
const { priceFormat } = require('../functions/helpers');
const { getBasket } = require('./basketController')();
const {
  removeBasketById,
  addOrder,
  getSwishStatus,
  updateSwishPayment
} = require('./dbController')();
const status = require('./orderStatuses');

const swish = new Swish({
  alias: process.env.SWISH_ALIAS,
  paymentRequestCallback: `${process.env.SWISH_CALLBACK}/api/order/swish/callback`,
  cert: JSON.parse(`"${process.env.SWISH_CERT}"`),
  key: JSON.parse(`"${process.env.SWISH_KEY}"`)
});

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
        grossPrice: item.grossPrice,
        momsRate: item.momsRate,
        quantity: item.quantity
      })),
      bottomLine: basket.statement.bottomLine,
      payment: {
        method: orderBody.paymentMethod
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
      await Promise.allSettled([
        addOrder(order),
        removeBasketById(basketId)
      ]);

      // SEND EMAIL

      return res.json({
        status: 'ok',
        order: {
          status: status.CONFIRMED,
          paymentMethod: order.payment.method
        }
      });
    }

    // Swish Payment
    if (order.payment.method === 'swish') {
      try {
        const response = await swish.createPaymentRequest({
          phoneNumber: order.details.telephone,
          amount: priceFormat(order.bottomLine.totalPrice, { includeSymbol: false })
        });
        const { id: swishId } = response;
        order.payment.swish = { id: swishId };
        await addOrder(order);

        return res.json({
          status: 'ok',
          order: {
            status: status.ORDERED,
            paymentMethod: order.payment.payment,
            swishId
          }
        });
      } catch (error) {
        debug(error.errors);
        return res.json({ status: 'error' });
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
      swish: response[0]
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
