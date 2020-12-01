const winston = require('winston');

module.exports.mochaGlobalSetup = () => {
  winston.add(new winston.transports.Console({
    silent: true
  }));
};
