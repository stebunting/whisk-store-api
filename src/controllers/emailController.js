// Page Tag
const tag = 'store-api:emailController';

// Requirements
const nodemailer = require('nodemailer');
const ejs = require('ejs');
const debug = require('debug')(tag);
const { priceFormat, parseDateCode } = require('../functions/helpers');

// Global Variables
const smtpServer = process.env.SMTP_SERVER;
const smtpUsername = process.env.SMTP_USERNAME;
const smtpPassword = process.env.SMTP_PASSWORD;
const sender = process.env.EMAIL_FROM;
let transporter;

function isConnected() {
  return new Promise((resolve, reject) => {
    if (transporter == null) {
      return reject(new Error('Not connected to SMTP server'));
    }
    return transporter.verify()
      .then((data) => resolve(data))
      .catch((error) => reject(error));
  });
}

function connect() {
  transporter = nodemailer.createTransport({
    host: smtpServer,
    port: 465,
    secure: true,
    auth: {
      user: smtpUsername,
      pass: smtpPassword
    }
  });
  return new Promise((resolve, reject) => {
    isConnected()
      .then((data) => resolve(data))
      .catch((error) => reject(error));
  });
}

function sendEmail(config) {
  return new Promise((resolve, reject) => {
    isConnected()
      .then((data) => {
        if (data) {
          const emailConfig = {
            ...config,
            bcc: process.env.EMAIL_BCC
          };
          return transporter.sendMail(emailConfig);
        }
        return reject(data);
      })
      .then((response) => resolve(response))
      .catch((error) => reject(error));
  });
}

async function sendConfirmationEmail(order, deliveryDate) {
  let html;
  let text;
  try {
    html = await ejs.renderFile('src/templates/orderConfirmationEmail.ejs', {
      order,
      deliveryDate: parseDateCode(deliveryDate).dateLong,
      priceFormat,
      storeUrl: process.env.WHISK_STORE_URL
    });
    text = await ejs.renderFile('src/templates/orderConfirmationPlaintext.ejs', {
      order,
      deliveryDate: parseDateCode(deliveryDate).dateLong,
      priceFormat
    });
  } catch (error) {
    debug(error);
  }

  const emailConfig = {
    from: sender,
    to: order.details.email,
    subject: 'WHISK Order',
    text,
    html
  };

  const response = await sendEmail(emailConfig);
  const correctResponse = response.response.substr(0, 6) === '250 OK';
  const containsEmailAddress = response.accepted.includes(order.details.email);
  return correctResponse && containsEmailAddress;
}

module.exports = { isConnected, connect, sendConfirmationEmail };
