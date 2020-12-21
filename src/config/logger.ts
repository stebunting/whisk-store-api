// Requirements
import winston from 'winston';
import { MongoDB } from 'winston-mongodb';
import Debug from 'debug';

// File tag
const tag = 'store-api:logger';
const debug = Debug(tag);

winston.add(new winston.transports.Console({
  level: 'info',
  format: winston.format.combine(
    winston.format.printf(({ level, message, metadata }) => (
      `${metadata && metadata.tag} | ${level} // ${message}`
    ))
  )
}));
winston.add(new winston.transports.File({
  level: 'info',
  filename: 'logs/log.log',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  )
}));
winston.add(new MongoDB({
  name: 'mongoDb',
  db: process.env.DB_URL || '',
  options: { useUnifiedTopology: true },
  collection: 'log',
  level: 'error'
}));
winston.info('MongoDB Logging Enabled', { metadata: { tag } });

export default winston;
