// Page Tag
const tag = 'store-api:authController';

// Requirements
const bcrypt = require('bcrypt');
const { log } = require('winston');
const debug = require('debug')(tag);
const { getAdminUser } = require('./dbController');

// Global Variables
const key = process.env.ADMIN_KEY;

async function login(req, res) {
  const { username, password } = req.body;
  const adminUsers = await getAdminUser(username.toLowerCase());

  let valid;
  if (adminUsers.length > 0) {
    try {
      valid = await bcrypt.compare(password, adminUsers[0].password);
    } catch (error) {
      log.error('Bcrypt failed when comparing admin password to db value', { metadata: tag, error });
    }
  }
  return valid
    ? res.status(200).json({ status: 'ok', login: true, key })
    : res.status(200).json({ status: 'ok', login: false });
}

function checkAdminKey(req, res, next) {
  const { authorization } = req.headers;
  if (authorization && authorization === `Basic ${key}`) {
    return next();
  }
  return res.json({ status: 'error' });
}

module.exports = { login, checkAdminKey };
