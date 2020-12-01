// File tag
const tag = 'store-api:logger';

// Requirements
const { createLogger, transports, format } = require('winston');
require('winston-mongodb');
const debug = require('debug')(tag);

const {
  combine,
  json,
  timestamp,
  printf
} = format;

const logger = createLogger({
  transports: [
    new transports.Console({
      level: 'info',
      format: printf(({ level, message }) => `${level} | ${message}`)
    }),
    new transports.File({
      level: 'info',
      filename: 'logs/log.log',
      format: combine(
        timestamp(),
        json()
      )
    }),
    new transports.MongoDB({
      level: 'error',
      db: process.env.DB_URL,
      collection: 'storeErrorLog'
    })
  ]
});

module.exports = logger;
