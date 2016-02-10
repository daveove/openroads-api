var _ = require('lodash');
var turfLinestring = require('turf-linestring');
var turfPOL = require('turf-point-on-line');
var turfPoint = require('turf-point');

/**
 * Calculates the shortest distance between a given point and the polygon.
 *
 * @param  areaPolygon
 * @param  point
 *   Raw coordinates [lng, lat] or geoJSON point
 * @return float
 *   The shortest distance from the point to the polygon.
 */
var distanceToPolygon = function (areaPolygon, point) {
  if (_.isArray(point)) {
    point = turfPoint(point);
  }
  // The kind of polygon we're working with can only have one set of coordinates.
  if (areaPolygon.geometry.type !== 'Polygon') {
    throw new Error('The area must be a Polygon');
  }

  // Get the polygon's outer ring create a lineString.
  var linestring = turfLinestring(areaPolygon.geometry.coordinates[0]);
  return turfPOL(linestring, point).properties.dist;
};

module.exports = distanceToPolygon;
