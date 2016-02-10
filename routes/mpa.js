'use strict';
var Boom = require('boom');

var _ = require('lodash');
var inside = require('turf-inside');
var buffer = require('turf-buffer');
var point = require('turf-point');
var polyDistance = require('../services/polygon-distance.js');
var queryMPAs = require('../services/query-mpas.js');
var coordsFromString = require('../services/coords.js').fromString;

module.exports = [
  /**
   * @api {get} /openroads/mpas Get list of MPAs
   * @apiGroup Marine Protected Areas
   * @apiName getMPAs
   * @apiDescription Returns a list with all the MPAs in geoJSON format.
   * @apiVersion 0.1.0
   *
   * @apiSuccess {[Object]} features List of MPAs
   *
   * @apiExample {curl} Example usage:
   *    curl http://localhost:4000/openroads/mpas
   *
   * @apiSuccessExample {json} Success-Response:
   *  {
   *    "type": "FeatureCollection",
   *    "properties": {},
   *    "features": [
   *      {
   *        "type": "Feature",
   *        "properties": {
   *          "protect_type": "marine_area",
   *          "area": "true",
   *          "id": 1
   *        },
   *        "geometry": {
   *          "type": "Polygon",
   *          "coordinates": [
   *            [
   *              [
   *                123.8365824,
   *                9.5779114
   *              ],
   *              [
   *                123.8473113,
   *                9.5779114
   *              ],
   *              [
   *                123.8475902,
   *                9.5710982
   *              ],
   *              [
   *                123.8365824,
   *                9.5779114
   *              ]
   *            ]
   *          ]
   *        }
   *      },
   *      ...
   *    ]
   *  }
   */
  {
    method: 'GET',
    path: '/openroads/mpas',
    handler: function (req, res) {
      queryMPAs.getMpas()
      .then(function (geoJSON) {
        return res(geoJSON);
      })
      .catch(function (err) {
        console.log(err);
        res(Boom.wrap(err));
      });
    }
  },

  /**
   * @api {get} /openroads/mpas/{id} Get MPA by id
   * @apiGroup Marine Protected Areas
   * @apiName getMPA
   * @apiDescription Returns an MPA by ID in GeoJSON format
   * @apiVersion 0.1.0
   *
   * @apiParam {Number} id MPA unique ID.
   *
   * @apiError MPANotFound The id of the MPA was not found.
   *
   * @apiExample {curl} Example usage:
   *    curl http://localhost:4000/openroads/mpas/1
   *
   * @apiSuccessExample {json} Success-Response:
   *  {
   *   "type": "Feature",
   *   "properties": {
   *     "protect_type": "marine_area",
   *     "area": "true",
   *     "id": 1
   *   },
   *   "geometry": {
   *     "type": "Polygon",
   *     "coordinates": [
   *       [
   *         [
   *           123.8365824,
   *           9.5779114
   *         ],
   *         [
   *           123.8473113,
   *           9.5779114
   *         ],
   *         [
   *           123.8475902,
   *           9.5710982
   *         ],
   *         [
   *           123.8365824,
   *           9.5779114
   *         ]
   *       ]
   *     ]
   *   }
   * }
   *
   * @apiErrorExample {json} Error-Response:
   * HTTP/1.1 404 Not Found
   * {
   *   "statusCode": 404,
   *   "error": "Not Found"
   * }
   */
  {
    method: 'GET',
    path: '/openroads/mpas/{mpaId}',
    handler: function (req, res) {
      var mpaId = parseInt(req.params.mpaId || '', 10);
      if (!mpaId || isNaN(mpaId) || mpaId < 0) {
        return res(Boom.badRequest('Mpa ID must be a non-zero number'));
      }

      queryMPAs.getMpa(mpaId)
      .then(function (feature) {
        res(feature);
      })
      .catch(function (err) {
        console.log(err);
        res(Boom.wrap(err));
      });
    }
  },

  /**
   * @api {get} /openroads/mpas/near/{coords}?limit={limit} Get list of MPA near coords
   * @apiGroup Marine Protected Areas
   * @apiName getMPAsNearCoords
   * @apiDescription Returns a list with all the MPAs in geoJSON format ordered by proximity to the specified coordinates.
   * @apiVersion 0.1.0
   *
   * @apiParam {String} coords Coordinates to check in format: lon,lat
   * @apiParam {Number} limit Number of MPA's to return. Default to all
   *
   * @apiSuccess {[Object]} features List of MPAs
   *
   * @apiExample {curl} Example usage:
   *    curl http://localhost:4000/openroads/mpas/near/123.84145259857176,9.58668014685045
   * @apiExample {curl} Example usage with limit:
   *    curl http://localhost:4000/openroads/mpas/near/123.84145259857176,9.58668014685045?limit=1
   *
   * @apiSuccessExample {json} Success-Response:
   *  {
   *    "type": "FeatureCollection",
   *    "properties": {},
   *    "features": [
   *      {
   *        "type": "Feature",
   *        "properties": {
   *          "protect_type": "marine_area",
   *          "area": "true",
   *          "id": 1
   *        },
   *        "geometry": {
   *          "type": "Polygon",
   *          "coordinates": [
   *            [
   *              [
   *                123.8365824,
   *                9.5779114
   *              ],
   *              [
   *                123.8473113,
   *                9.5779114
   *              ],
   *              [
   *                123.8475902,
   *                9.5710982
   *              ],
   *              [
   *                123.8365824,
   *                9.5779114
   *              ]
   *            ]
   *          ]
   *        }
   *      },
   *      ...
   *    ]
   *  }
   */
  {
    method: 'GET',
    path: '/openroads/mpas/near/{coords}', // limit=X
    handler: function (req, res) {
      var coords = coordsFromString(req.params.coords);
      if (!coords) {
        return res(Boom.badRequest('Bad coordinates format. Use lng,lat'));
      }
      var coordsPoint = point(coords);

      var limit = parseFloat(req.query.limit);
      if (isNaN(limit) || limit <= 0) {
        limit = null;
      }

      queryMPAs.getMpas()
      .then(function (geoJSON) {
        var f = _.chain(geoJSON.features)
          .map(function (o) {
            // When inside the distance becomes 0.
            if (inside(coordsPoint, o)) {
              o.properties.distance = 0;
            } else {
              o.properties.distance = polyDistance(o, coordsPoint);
            }
            return o;
          })
          .sortBy(function (o) {
            return o.properties.distance;
          });

        if (limit !== null) {
          f = f.take(limit);
        }

        geoJSON.features = f.value();
        return res(geoJSON);
      })
      .catch(function (err) {
        console.log(err);
        res(Boom.wrap(err));
      });
    }
  },

  /**
   * @api {get} /openroads/mpas/contain/{coords}?radius={radius} Get list of MPA that contain coords
   * @apiGroup Marine Protected Areas
   * @apiName getMPAsContainCoords
   * @apiDescription Returns a list with all the MPAs in geoJSON format that contain the specified coordinates.
   * @apiVersion 0.1.0
   *
   * @apiParam {String} coords Coordinates to check in format: lon,lat
   * @apiParam {Number} radius Radius in kilometers from the coordinates to perform the check.
   *
   * @apiSuccess {[Object]} features List of MPAs
   *
   * @apiExample {curl} Example usage:
   *    curl http://localhost:4000/openroads/mpas/contain/123.84145259857176,9.58668014685045
   * @apiExample {curl} Example usage with radius:
   *    curl http://localhost:4000/openroads/mpas/contain/123.84145259857176,9.58668014685045?radius=1
   *
   * @apiSuccessExample {json} Success-Response:
   *  {
   *    "type": "FeatureCollection",
   *    "properties": {},
   *    "features": [
   *      {
   *        "type": "Feature",
   *        "properties": {
   *          "protect_type": "marine_area",
   *          "area": "true",
   *          "id": 1
   *        },
   *        "geometry": {
   *          "type": "Polygon",
   *          "coordinates": [
   *            [
   *              [
   *                123.8365824,
   *                9.5779114
   *              ],
   *              [
   *                123.8473113,
   *                9.5779114
   *              ],
   *              [
   *                123.8475902,
   *                9.5710982
   *              ],
   *              [
   *                123.8365824,
   *                9.5779114
   *              ]
   *            ]
   *          ]
   *        }
   *      },
   *      ...
   *    ]
   *  }
   *
   * @apiSuccessExample {json} No results response:
   *  {
   *    "type": "FeatureCollection",
   *    "properties": {},
   *    "features": [ ]
   *  }
   */
  {
    method: 'GET',
    path: '/openroads/mpas/contain/{coords}', // radius=X
    handler: function (req, res) {
      var coords = coordsFromString(req.params.coords);
      if (!coords) {
        return res(Boom.badRequest('Bad coordinates format. Use lng,lat'));
      }
      var coordsPoint = point(coords);

      var radius = parseFloat(req.query.radius);
      if (isNaN(radius) || radius <= 0) {
        radius = null;
      }

      queryMPAs.getMpas()
      .then(function (geoJSON) {
        geoJSON.features = _.filter(geoJSON.features, function (f) {
          // Buffer if radius is set.
          f = radius ? buffer(f, radius, 'kilometers') : f;
          return inside(coordsPoint, f);
        });

        return res(geoJSON);
      })
      .catch(function (err) {
        console.log('err');
        res(Boom.wrap(err));
      });
    }
  },

  /**
   * @api {get} /openroads/mpas/{id}/contain/{coords}?radius={radius} Get MPA by id if it contains the specified coordinates
   * @apiGroup Marine Protected Areas
   * @apiName getMPAContainCoords
   * @apiDescription Returns a MPA by ID in GeoJSON format if it contains the specified coordinates.
   * @apiVersion 0.1.0
   *
   * @apiParam {Number} id MPA unique ID.
   * @apiParam {String} coords Coordinates to check in format: lon,lat
   * @apiParam {Number} radius Radius in kilometers from the coordinates to perform the check.
   *
   * @apiError MPANotFound The id of the MPA was not found.
   *
   * @apiExample {curl} Example usage:
   *    curl http://localhost:4000/openroads/mpas/1/contain/123.84145259857176,9.58668014685045
   * @apiExample {curl} Example usage with radius:
   *    curl http://localhost:4000/openroads/mpas/1/contain/123.84145259857176,9.58668014685045?radius=1
   *
   * @apiSuccessExample {json} Success-Response:
   *  {
   *   "type": "Feature",
   *   "properties": {
   *     "protect_type": "marine_area",
   *     "area": "true",
   *     "id": 1
   *   },
   *   "geometry": {
   *     "type": "Polygon",
   *     "coordinates": [
   *       [
   *         [
   *           123.8365824,
   *           9.5779114
   *         ],
   *         [
   *           123.8473113,
   *           9.5779114
   *         ],
   *         [
   *           123.8475902,
   *           9.5710982
   *         ],
   *         [
   *           123.8365824,
   *           9.5779114
   *         ]
   *       ]
   *     ]
   *   }
   * }
   *
   * @apiSuccessExample {json} No results response:
   *  { }
   *
   * @apiErrorExample {json} Error-Response:
   * HTTP/1.1 404 Not Found
   * {
   *   "statusCode": 404,
   *   "error": "Not Found"
   * }
   */
  {
    method: 'GET',
    path: '/openroads/mpas/{mpaId}/contain/{coords}', // radius=X',
    handler: function (req, res) {
      var mpaId = parseInt(req.params.mpaId || '', 10);
      if (!mpaId || isNaN(mpaId) || mpaId < 0) {
        return res(Boom.badRequest('Mpa ID must be a non-zero number'));
      }

      var coords = coordsFromString(req.params.coords);
      if (!coords) {
        return res(Boom.badRequest('Bad coordinates format. Use lng,lat'));
      }
      var coordsPoint = point(coords);

      var radius = parseFloat(req.query.radius);
      if (isNaN(radius) || radius <= 0) {
        radius = null;
      }

      queryMPAs.getMpa(mpaId)
      .then(function (feature) {
        console.log('resp', feature);
        var f = radius ? buffer(feature, radius, 'kilometers') : feature;
        if (inside(coordsPoint, f)) {
          return res(f);
        } else {
          return res({});
        }
      })
      .catch(function (err) {
        console.log(err);
        res(Boom.wrap(err));
      });
    }
  }
];
