// Page Tag
const tag = 'store-api:orderController';

// Requirements
const Swish = require('swish-merchant');
const debug = require('debug')(tag);
const { priceFormat } = require('../functions/helpers');
const { getBasket } = require('./basketController')();
const { removeBasketById, addOrder } = require('./dbController')();
const status = require('./orderStatuses');

const swish = new Swish({
  alias: process.env.SWISH_ALIAS,
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
    const basket = await getBasket(basketId);

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
        return res.json({
          status: 'ok',
          order: {
            status: status.ORDERED,
            paymentMethod: order.payment.payment
          }
        });
      } catch (error) {
        debug(error.errors);
      }
    }
  }

  return {
    createOrder
  };
}

module.exports = orderController;
