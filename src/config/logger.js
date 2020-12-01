// File tag
const tag = 'store-api:logger';

// Requirements
const winston = require('winston');
require('winston-mongodb');
const debug = require('debug')(tag);

winston.add(new winston.transports.Console({
  name: 'console',
  level: 'info',
  format: winston.format.combine(
    winston.format.printf(({ level, message }) => `${level} | ${message}`)
  )
}));
winston.add(new winston.transports.File({
  name: 'file',
  level: 'info',
  filename: 'logs/log.log',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  )
}));
winston.add(new winston.transports.MongoDB({
  name: 'mongoDb',
  level: 'error',
  db: process.env.DB_URL,
  options: { useUnifiedTopology: true },
  collection: 'storeErrorLog',
  metaKey: 'metadata'
}));
winston.info('MongoDB Logging Enabled');

module.exports = winston;
