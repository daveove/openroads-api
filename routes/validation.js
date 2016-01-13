var Boom = require('boom');
var validate = require('../services/validate');

module.exports = {
  method: 'GET',
  path: '/validate',
  handler: function (req, res) {
    validate().then(function (meta) {
      return res(JSON.stringify(meta));
    }).catch(function (err) {
      return res(Boom.wrap(err));
    });
  }
}
