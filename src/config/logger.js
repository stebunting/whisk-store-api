// File tag
const tag = 'store-api:logger';

// Requirements
const { createLogger, transports, format } = require('winston');
require('winston-mongodb');
const debug = require('debug')(tag);

function logger(logTag) {
  return createLogger({
    transports: [
      new transports.Console({
        level: 'info',
        format: format.combine(
          format.label({ label: logTag }),
          format.printf(({ level, message, label }) => `${level} | ${label} // ${message}`)
        )
      }),
      new transports.File({
        level: 'info',
        filename: 'logs/log.log',
        format: format.combine(
          format.label({ label: logTag }),
          format.timestamp()
        )
      }),
      new transports.MongoDB({
        level: 'error',
        db: process.env.DB_URL,
        collection: 'storeErrorLog',
        label: logTag,
        metaKey: 'metadata'
      })
    ]
  });
}

module.exports = logger;
