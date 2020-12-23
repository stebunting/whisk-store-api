// Requirements
import assert from 'assert';

// Types
import { Order } from '../src/types/Order';

// Controllers
import { isConnected, connect, sendConfirmationEmail } from '../src/controllers/emailController';

// Page Tag
const tag = 'store-api:emailController.test';
const testData = require('./testData.json');

describe('E-Mailer...', () => {
  let orders: Array<Order>;

  const setUpTestData = () => {
    orders = testData.orders;
  };

  describe('rejects when...', () => {
    beforeEach(setUpTestData);

    it('transporter not yet connected', async () => {
      await assert.rejects(isConnected(), (error) => {
        assert.strictEqual(error.message, 'Not connected to SMTP server');
        return true;
      });
    });

    it('attempting to send e-mail before transporter created', async () => {
      const order = orders[0];
      await assert.rejects(sendConfirmationEmail(order), (error) => {
        assert.strictEqual(error.message, 'Not connected to SMTP server');
        return true;
      });
    });
  });

  describe('correctly...', () => {
    beforeEach(setUpTestData);

    it('creates transporter', async () => {
      const response = await connect();
      assert(response);
    });

    it('sends confirmation email', async () => {
      const order = orders[0];
      const response = await sendConfirmationEmail(order);
      assert(response);
    });
  });
});
