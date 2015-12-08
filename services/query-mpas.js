'use strict';
var Boom = require('boom');
var _ = require('lodash');

var knex = require('../connection.js');
var queryWays = require('../services/query-ways.js');
var toGeoJSON = require('../services/osm-data-to-geojson.js');

/**
 * Queries all the MAPs and converts them to a feature collection.
 *
 * @return Promise
 *   Param is the feature collection object.
 */
var getMpas = function () {
  return knex('current_way_tags')
  .select('way_id')
  .where({
    k: 'protect_type',
    v: 'marine_area'
  })
  .then(function (resp) {
    var ids = _.pluck(resp, 'way_id');
    return queryWays(knex, ids);
  })
  .then(function (result) {
    var geoJSON = toGeoJSON(result, 'Polygon');
    // Keep the Id.
    _.forEach(geoJSON.features, function (o, i) {
      geoJSON.features[i].properties.id = +(result.ways[i].id);
    });
    return geoJSON;
  });
};

/**
 * Queries a single MPA by its id.
 *
 * @param  int id
 *   The MPA's id
 *
 * @throws notFound
 *   If The provided ID does not belong to an MPA.
 * @throws badRequest
 *   If The provided ID is not an MPA.
 *
 * @return Promise
 *   Param is the MPA feature
 */
var getMpa = function (id) {
  return queryWays(knex, id)
  .then(function (resp) {
    if (!resp.ways.length) {
      throw Boom.notFound();
    }

    var hasTag = _.find(resp.ways[0].tags, {k: 'protect_type', v: 'marine_area'});
    if (!hasTag) {
      throw Boom.badRequest('Provided ID is not an MPA');
    }
    // Return only one feature.
    var feature = toGeoJSON(resp, 'Polygon').features[0];
    feature.properties.id = +(id);
    return feature;
  });
};

module.exports = {
  getMpas: getMpas,
  getMpa: getMpa
};
