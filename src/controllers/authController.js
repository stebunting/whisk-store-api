// Page Tag
const tag = 'store-api:authController';

// Requirements
const debug = require('debug')(tag);

// Global Variables
const adminKey = process.env.ADMIN_KEY;

function checkAdminKey(req, res, next) {
  const { authorization } = req.headers;
  if (authorization && authorization === `Basic ${adminKey}`) {
    return next();
  }
  return res.json({ status: 'error' });
}

module.exports = { checkAdminKey };
