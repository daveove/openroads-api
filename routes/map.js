'use strict';
var Boom = require('boom');
var BoundingBox = require('../services/BoundingBox.js');
var QuadTile = require('../services/QuadTile.js');

module.exports = {
  method: 'GET',
  path: '/xml/map',
  handler: function (req, res) {
    // parse and validate bbox parameter from query
    var paramString = req.query.bbox || '';
    var bbox = new BoundingBox.fromCoordinates(paramString.split(','));
    if(bbox.error) {
      // TODO: log error to server
      return res(Boom.badRequest(bbox.error));
    }
    // Plan
    // 1. query: nodes in given bbox
    // 2. query: ways associated with those nodes
    // 3. query: nodes contained by those ways
    // serialize response (bounds, nodes, ways)

    res(null, 'DUMMY PAYLOAD');
  }
};
