'use strict';

var Boom = require('boom');
var _ = require('lodash');
var Promise = require('bluebird');

var getAdminBoundary = require('../services/admin-boundary.js');
var getSubregionFeatures = require('../services/admin-subregions.js').getFeatures;
var listSubregions = require('../services/admin-subregions.js').list;
var queryPolygon = require('../services/query-polygon.js');
var knex = require('../connection');

module.exports = [
  /**
   * @api {get} /admin/:id Get metadata about an admin area.
   * @apiGroup Administrative areas
   * @apiName GetAdmin
   * @apiDescription This endpoint returns the metadata about the given
   * admin area.
   * @apiVersion 0.1.0
   *
   * @apiParam {Number} ID ID of the region, province, municipality, city or 
   * barangay.
   * 
   * @apiSuccess {Number} id Region ID.
   * @apiSuccess {String} name Region name.
   * @apiSuccess {Number} type Region type.
   * @apiSuccess {String} NAME_0 Country name.
   * @apiSuccess {String} NAME_1 Region name.
   * @apiSuccess {String} NAME_2 Province name.
   * @apiSuccess {String} NAME_3 Municipality / city name.
   * @apiSuccess {String} ID_1_OR Region ID.
   * @apiSuccess {String} ID_1_OR Region ID.
   * @apiSuccess {String} ID_2_OR Province ID.
   * @apiSuccess {String} ID_3_OR Municipality / city ID.
   *
   * @apiExample {curl} Metadata: 
   *    curl http://localhost:4000/admin/13591204000
   *
   * @apiSuccessExample {json} metadata
   * {
   *   "id": 13591204000,
   *   "name": "Dumaran",
   *   "type": 3,
   *   "NAME_0": "Philippines",
   *   "NAME_1": "Region IV-B (Mimaropa)",
   *   "NAME_2": "Palawan"
   *   "ID_1_OR": 13000000000,
   *   "ID_2_OR": 13590000000
   * }
   */
  /**
   * @api {get} /admin/:id?boundary=true Get metadata and boundaries of an admin area.
   * @apiGroup Administrative areas
   * @apiName GetAdminBoundaries
   * @apiDescription This endpoint returns the metadata and boundaries about the
   * given admin area.
   * The results are returned in GeoJSON.
   * @apiVersion 0.1.0
   *
   * @apiParam {Number} ID ID of the region, province, municipality, city or 
   * barangay.
   * 
   * @apiSuccess {String} type The geoJSON type
   * @apiSuccess {Object} properties The geoJSON properties
   * @apiSuccess {Number} properties.id Region ID.
   * @apiSuccess {String} properties.name Region name.
   * @apiSuccess {Number} properties.type Region type.
   * @apiSuccess {String} properties.NAME_0 Country name.
   * @apiSuccess {String} properties.NAME_1 Region name.
   * @apiSuccess {String} properties.NAME_2 Province name.
   * @apiSuccess {String} properties.NAME_3 Municipality / city name.
   * @apiSuccess {String} properties.ID_1_OR Region ID.
   * @apiSuccess {String} properties.ID_1_OR Region ID.
   * @apiSuccess {String} properties.ID_2_OR Province ID.
   * @apiSuccess {String} properties.ID_3_OR Municipality / city ID.
   * @apiSuccess {Object} geometry The geoJSON geometry.

   *
   * @apiExample {curl} Example Usage: 
   *    curl http://localhost:4000/admin/13591204000?boundary=true
   *
   * @apiSuccessExample {json} Success-Response:
   * {
   *   "type": "Feature",
   *   "properties": {
   *     "id": 13591204000,
   *     "name": "Dumaran",
   *     "type": 3,
   *     "NAME_0": "Philippines",
   *     "NAME_1": "Region IV-B (Mimaropa)",
   *     "NAME_2": "Palawan",
   *     "ID_1_OR": 13000000000,
   *     "ID_2_OR": 13590000000
   *   },
   *   "geometry": {
   *     "type": "MultiPolygon",
   *     "coordinates": [...]
   *   }
   * }
   */
  /**
   * @api {get} /admin/:id?roadNetwork=true Get metadata and road-network of an admin area.
   * @apiGroup Administrative areas
   * @apiName GetAdminRoadNetwork
   * @apiDescription This endpoint returns the metadata and road-network about
   * the given admin area.
   * The results are returned in GeoJSON.
   * @apiVersion 0.1.0
   *
   * @apiParam {Number} ID ID of municipality, city or barangay.
   * 
   * @apiSuccess {String} type The geoJSON type
   * @apiSuccess {Object} properties The geoJSON properties
   * @apiSuccess {Number} properties.id Region ID.
   * @apiSuccess {String} properties.name Region name.
   * @apiSuccess {Number} properties.type Region type.
   * @apiSuccess {String} properties.NAME_0 Country name.
   * @apiSuccess {String} properties.NAME_1 Region name.
   * @apiSuccess {String} properties.NAME_2 Province name.
   * @apiSuccess {String} properties.NAME_3 Municipality / city name.
   * @apiSuccess {String} properties.ID_1_OR Region ID.
   * @apiSuccess {String} properties.ID_1_OR Region ID.
   * @apiSuccess {String} properties.ID_2_OR Province ID.
   * @apiSuccess {String} properties.ID_3_OR Municipality / city ID.
   * @apiSuccess {Array} features The roads
   *
   * @apiExample {curl} Example Usage: 
   *    curl http://localhost:4000/admin/13591204000?roadNetwork=true
   *
   * @apiSuccessExample {json} Success-Response:
   * {
   *   "type": "FeatureCollection",
   *   "properties": {
   *     "id": 13591204000,
   *     "name": "Dumaran",
   *     "type": 3,
   *     "NAME_0": "Philippines",
   *     "NAME_1": "Region IV-B (Mimaropa)",
   *     "NAME_2": "Palawan"
   *     "ID_1_OR": 13000000000,
   *     "ID_2_OR": 13590000000
   *   },
   *   "features": [
   *     {
   *       "type": "Feature",
   *       "properties": {
   *         "highway": "road",
   *         "source": "Palawan Provincial Government, in association with REID Foundation and World bank."
   *       },
   *       "geometry": {
   *         "type": "LineString",
   *         "coordinates": [...]
   *       }
   *     }
   *   ]
   * }
   */
  {
    method: 'GET',
    path: '/admin/{id}',
    handler: function (req, res) {
      var id = +(req.params.id || '');

      // Query for boundary.
      if (Boolean(req.query.boundary) == true) {
        getAdminBoundary(id).then(function (boundary) {
          var props = fixProperties(boundary, boundary.properties);
          // Result is a geoJSON;
          var result = {
            type: boundary.type,
            properties: props,
            geometry: boundary.geometry
          };

          return res(result);
        })
        .catch(function (err) {
          console.log('err', err);
          res(Boom.wrap(err));
        });
      }
      // Query for Road Network.
      else if (Boolean(req.query.roadNetwork) == true) {
        getAdminBoundary(id).then(function (boundary) {
          return queryPolygon(boundary).then(function (roads) {
            var props = fixProperties(boundary, roads.properties);
            // Result is a geoJSON;
            var result = {
              type: roads.type,
              properties: props,
              features: roads.features
            };
            return res(result);
          });
        })
        .catch(function (err) {
          console.log('err', err);
          res(Boom.wrap(err));
        });
      }
      // Return meta.
      else {
        getAdminBoundary(id).then(function (boundary) {
          var main = fixProperties(boundary, boundary.properties);
          return res(main);
        })
        .catch(function (err) {
          console.log('err', err);
          res(Boom.wrap(err));
        });
      }

    }
  },

  /**
   * @api {get} /admin/subregions Get subregions of the whole country.
   * @apiGroup Administrative areas subregions
   * @apiName GetSubregions
   * @apiDescription This endpoint returns the subregions of the whole country.
   * @apiVersion 0.1.0
   *
   * @apiSuccess {Array} adminAreas The regions
   * @apiSuccess {Number} adminAreas.id Region ID.
   * @apiSuccess {String} adminAreas.name Region name.
   *
   * @apiExample {curl} Example Usage: 
   *    curl http://localhost:4000/admin/subregions
   *
   * @apiSuccessExample {json} Success-Response:
   * {
   *   "adminAreas": [
   *     {
   *       "name": "Region I (Ilocos region)",
   *       "id": 1000000000
   *     },
   *     {
   *       "name": "Region II (Cagayan Valley)",
   *       "id": 2000000000
   *     }
   *     ...  
   *   ]
   * }
   */
  {
    method: 'GET',
    path: '/admin/subregions',
    handler: function (req, res) {
      return listSubregions().then(function (subregions) {
        // Fix subregion id.
        _.forEach(subregions, function (o) {
          o.id = +(o.id);
        });
        return res({ adminAreas: subregions });
      })
      .catch(function (err) {
        console.log('err', err);
        res(Boom.wrap(err));
      });
    }
  },

  /**
   * @api {get} /admin/:id/subregions Get metadata of subregions of an admin area.
   * @apiGroup Administrative areas subregions
   * @apiName GetAdminSubregions
   * @apiDescription This endpoint returns the metadata about the subregions of 
   * a given admin area.
   * @apiVersion 0.1.0
   *
   * @apiParam {Number} ID ID of the region, province, municipality, city or 
   * barangay.
   * 
   * @apiSuccess {Number} id Region ID.
   * @apiSuccess {String} name Region name.
   * @apiSuccess {Number} type Region type.
   * @apiSuccess {String} NAME_0 Country name.
   * @apiSuccess {String} NAME_1 Region name.
   * @apiSuccess {String} NAME_2 Province name.
   * @apiSuccess {String} NAME_3 Municipality / city name.
   * @apiSuccess {String} ID_1_OR Region ID.
   * @apiSuccess {String} ID_1_OR Region ID.
   * @apiSuccess {String} ID_2_OR Province ID.
   * @apiSuccess {String} ID_3_OR Municipality / city ID.
   * @apiSuccess {Array} adminAreas The regions
   * @apiSuccess {Number} adminAreas.id Region ID.
   * @apiSuccess {String} adminAreas.name Region name.
   * @apiSuccess {Number} adminAreas.type Region type (2, 3, 4).
   *
   * @apiExample {curl} Example Usage: 
   *    curl http://localhost:4000/admin/13591204000/subregions
   *
   * @apiSuccessExample {json} Success-Response:
   * {
   *   "id": 13591204000,
   *   "name": "Dumaran",
   *   "type": 3,
   *   "NAME_0": "Philippines",
   *   "NAME_1": "Region IV-B (Mimaropa)",
   *   "NAME_2": "Palawan"
   *   "ID_1_OR": 13000000000,
   *   "ID_2_OR": 13590000000
   *   "adminAreas": [
   *     {
   *       "name": "Bacao",
   *       "id": 13591204001,
   *       "type": 4
   *     }
   *   ]
   * }
   */
  /**
   * @api {get} /admin/:id/subregions?boundary=true Get metadata and boundaries of the subregions of an admin area.
   * @apiGroup Administrative areas subregions
   * @apiName GetAdminSubregionsBoundaries
   * @apiDescription This endpoint returns the metadata and boundaries about the
   * subregions of a given admin area.
   * The results are returned in GeoJSON.
   * @apiVersion 0.1.0
   *
   * @apiParam {Number} ID ID of the municipality, city or barangay.
   * 
   * @apiSuccess {String} type The geoJSON type
   * @apiSuccess {Object} properties The geoJSON properties
   * @apiSuccess {Number} properties.id Region ID.
   * @apiSuccess {String} properties.name Region name.
   * @apiSuccess {Number} properties.type Region type.
   * @apiSuccess {String} properties.NAME_0 Country name.
   * @apiSuccess {String} properties.NAME_1 Region name.
   * @apiSuccess {String} properties.NAME_2 Province name.
   * @apiSuccess {String} properties.NAME_3 Municipality / city name.
   * @apiSuccess {String} properties.ID_1_OR Region ID.
   * @apiSuccess {String} properties.ID_1_OR Region ID.
   * @apiSuccess {String} properties.ID_2_OR Province ID.
   * @apiSuccess {String} properties.ID_3_OR Municipality / city ID.
   * @apiSuccess {Array} features The roads
   * @apiSuccess {String} features.type The geoJSON type
   * @apiSuccess {Object} features.geometry The geoJSON geometry
   * @apiSuccess {Object} features.properties The geoJSON properties
   * @apiSuccess {Number} features.properties.id Region ID.
   * @apiSuccess {String} features.properties.name Region name.
   * @apiSuccess {Number} features.properties.type Region type (2, 3, 4).
   *
   * @apiExample {curl} Example Usage: 
   *    curl http://localhost:4000/admin/13591204000/subregions?boundary=true
   *
   * @apiSuccessExample {json} Success-Response:
   * {
   *   "type": "FeatureCollection",
   *   "properties": {
   *     "NAME_0": "Philippines",
   *     "NAME_1": "Region IV-B (Mimaropa)",
   *     "NAME_2": "Palawan"
   *     "ID_1_OR": 13000000000,
   *     "ID_2_OR": 13590000000
   *     "id": 13591204000,
   *     "type": 3,
   *     "name": "Dumaran"
   *   },
   *   "features": [
   *     {
   *       "type": "Feature",
   *       "properties": {
   *         "id": 13591204001,
   *         "name": "Bacao",
   *         "type": 4
   *       },
   *       "geometry": {
   *         "type": "Polygon",
   *         "coordinates": [
   *           [
   *             [
   *               119.79149627685547,
   *               10.508410453796499
   *             ]
   *           ]
   *         ]
   *       }
   *     }
   *   ]
   * }
   */
  {
    method: 'GET',
    path: '/admin/{id}/subregions',
    handler: function (req, res) {
      var id = +(req.params.id || '');

      if (Boolean(req.query.boundary) == true) {
        getAdminBoundary(id).then(function (boundary) {
          if (boundary.adminType <= 2) {
            return res(Boom.badRequest('Request region is too large.'));
          }

          return getSubregionFeatures(boundary.adminType, id, boundary).then(function (subregions) {
            var features = _.map(subregions.features, function (o) {
              var obj = _.pick(o, 'type', 'geometry');
              switch(boundary.adminType) {
                case 3:
                  obj.properties = {
                    id: +(o.id),
                    name: o.name,
                    type: 4
                  };
                break;
                // There are no subregions for adminType 4
              }
              return obj;
            });

            var props = fixProperties(boundary, subregions.properties);
            // Result is a geoJSON;
            var result = {
              type: subregions.type,
              properties: props,
              features: features
            };

            return res(result);
          });
        })
        .catch(function (err) {
          console.log('err', err);
          res(Boom.wrap(err));
        });
      }
      else {
        getAdminBoundary(id).then(function (boundary) {
          return listSubregions(boundary.adminType, id, boundary).then(function (subregions) {
            // Fix subregion id.
            _.forEach(subregions, function (o) {
              o.id = +(o.id);
            });

            var main = fixProperties(boundary, boundary.properties);
            main.adminAreas = subregions;
            return res(main);
          });
        })
        .catch(function (err) {
          console.log('err', err);
          res(Boom.wrap(err));
        });
      }
      }

  },

  /**
   * @api {get} /admin/search/:name Search for administrative area by name
   * @apiGroup Administrative areas
   * @apiName SearchAdmin
   * @apiDescription Given a search string, return 10 matching administrative
   * area. Search is case insensitive.
   * @apiVersion 0.1.0
   *
   * @apiParam {String} name Search parameter
   * 
   * @apiSuccess {Object[]} boundaries List of matching boundaries
   * @apiSuccess {String} boundaries.id  ID of boundary
   * @apiSuccess {String} boundaries.name Name of boundary
   * @apiSuccess {String} boundaries.type  type of boundary
   *
   * @apiExample {curl} Example Usage: 
   *    curl http://localhost:4000/admin/search/Bayan
   *
   * @apiSuccessExample {json} Success-Response:
   *  [
   *    {
   *      "id": "6360688002",
   *      "name": "Atabayan",
   *       "type": 4
   *    },
   *    {
   *      "id": "10160264001",
   *      "name": "Bagongbayan",
   *      "type": 4
   *    },
   *    ...
   *  ]
   */
  {
    method: 'GET',
    path: '/admin/search/{name}',
    handler: function (req, res) {

      var name = '%' + req.params.name + '%';

      knex.select('id', 'name', 'type')
        .from('admin_boundaries')
        .where('name', 'like', name)
        .orderBy('name')
        .limit(10)
        .then(function (data) {
          _.forEach(data, function (o) {
            o.id = +(o.id);
          });
          res(data);
        });
    }
  }
];

/**
 * Helper function
 *
 * Extracts and combines the needed keys from baseMeat and rawProps,
 * 
 * @param  baseMeta
 *   The base meta for the admin area. Expects it to contain the following keys:
 *   - id
 *   - name
 *   - adminType (will be changed to "type")
 *  
 * @param  rawProps
 *   The properties from where to extract the values when they exist and when 
 *   they're not null:
 *   NAME_0, NAME_1, NAME_2, NAME_3, NAME_4,
 *   ID_0_OR, ID_1_OR, ID_2_OR', ID_3_OR, ID_4_OR
 * 
 * @return props
 */
var fixProperties = function (baseMeta, rawProps) {
  var props = _.pick(rawProps, ['NAME_0', 'NAME_1', 'NAME_2', 'NAME_3', 'NAME_4', 'ID_0_OR', 'ID_1_OR', 'ID_2_OR', 'ID_3_OR', 'ID_4_OR']);
  props = _.omit(props, _.isNull);
  props.id = baseMeta.id;
  props.name = baseMeta.name;
  props.type = baseMeta.adminType;

  return props;
}
