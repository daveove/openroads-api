var log = require('./log');

module.exports = {
  log: function (last, op) {
    if (last === null) {
      return null;
    }
    log.info(op, (new Date() - last) / 1000, 's');
    return new Date();
  }
};
