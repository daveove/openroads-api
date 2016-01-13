'use strict';

var knex = require('../connection');
var extent = require('turf-extent');
var clip = require('./clip');
var toGeoJSON = require('./osm-data-to-geojson');
var queryBbox = require('./query-bbox');
var BoundingBox = require('./bounding-box');
var performance = require('./performance');

// Query the given GeoJSON Polygon Feature, returning a promise to be
// fulfilled with a GeoJSON FeatureCollection representing the (clipped)
// roads within that polygon.
module.exports = function(boundary) {
  var bbox = new BoundingBox.fromCoordinates(extent(boundary));

  return queryBbox(knex, bbox)
  .then(function (result) {
    var last = new Date();
    var roads = toGeoJSON(result);
    roads.features = clip(roads.features, boundary);
    roads.properties = boundary.properties;
    last = performance.log(last, 'query-polygon geojson parsing');
    return roads;
  });
};
