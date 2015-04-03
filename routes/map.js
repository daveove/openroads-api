'use strict';
var Boom = require('boom');

module.exports = {
    method: 'GET',
    path: '/xml/map',
    handler: function (req, res) {
      // parse and validate bbox parameter from query
      if (true) {
        res(Boom.badRequest('Query must contain a valid bounding box'));
        return;
      }

      // Plan
      // 1. query: nodes in given bbox
      // 2. query: ways associated with those nodes
      // 3. query: nodes contained by those ways
      // serialize response (bounds, nodes, ways)

      res(200);
    }
};
