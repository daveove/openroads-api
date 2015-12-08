'use strict';

var Boom = require('boom');
var _ = require('lodash');

var getAdminBoundary = require('../services/admin-boundary.js');
var getSubregionFeatures = require('../services/admin-subregions.js').getFeatures;
var listSubregions = require('../services/admin-subregions.js').list;
var queryPolygon = require('../services/query-polygon.js');
var knex = require('../connection');

module.exports = [
  /**
   * @api {get} /subregions/ Get list of regions
   * @apiGroup Administrative areas
   * @apiName subregions
   * @apiDescription Returns a list with all the regions.
   * @apiVersion 0.1.0
   *
   * @apiSuccess {Object[]} adminAreas      List of regions
   * @apiSuccess {String} adminAreas.name   Region name.
   * @apiSuccess {String} adminAreas.id     Region ID.
   *
   * @apiExample {curl} Example Usage: 
   *    curl http://localhost:4000/subregions
   *  
   * @apiSuccessExample {json} Success-Response:
   *  {
   *    "adminAreas": [
   *    {
   *      "name": "Region I (Ilocos region)",
   *      "id": "1000000000"
   *    },
   *    {
   *      "name": "Region II (Cagayan Valley)",
   *      "id": "2000000000"
   *    },
   *    ...
   *    ]
   *  }
   */
  {
    method: 'GET',
    path: '/subregions',
    handler: function (req, res) {
      return listSubregions()
      .then(function (subregions) {
        return res({ adminAreas: subregions });
      })
      .catch(function(err) {
        res(Boom.wrap(err));
      });
    }
  },
  /**
   * @api {get} /subregions/:id Get list of subregions by ID
   * @apiGroup Administrative areas
   * @apiName GetSubregions
   * @apiDescription Returns meta-data about an administrative area and its 
   * direct descendants. When passing the ID of a province, the API returns
   * only its municipalities and cities, not the barangays.
   * @apiVersion 0.1.0
   *
   * @apiParam {Number} id ID of the region, province, municipality, city or 
   * barangay.
   * 
   * @apiSuccess {Object} meta Region metadata
   * @apiSuccess {Number} meta.id Region ID.
   * @apiSuccess {String} meta.name Region name.
   * @apiSuccess {Number} meta.type Region type.
   * @apiSuccess {String} meta.NAME_0 Country name.
   * @apiSuccess {String} meta.NAME_1 Region name.
   * @apiSuccess {String} meta.NAME_2 Province name.
   * @apiSuccess {String} meta.NAME_3 Municipality / city name.
   * @apiSuccess {String} meta.NAME_4 Barangay name.
   * @apiSuccess {String} meta.ID_1_OR Region ID.
   * @apiSuccess {String} meta.ID_1_OR Region ID.
   * @apiSuccess {String} meta.ID_2_OR Province ID.
   * @apiSuccess {String} meta.ID_3_OR Municipality / city ID.
   * @apiSuccess {String} meta.ID_4_OR Barangay ID.
   * @apiSuccess {Object[]} adminAreas List of Subregions.
   * @apiSuccess {String} adminAreas.name   Subregion name.
   * @apiSuccess {String} adminAreas.id     Subregion ID.
   *
   * @apiExample {curl} Example Usage: 
   *    curl http://localhost:4000/subregions/2000000000
   *
   * @apiSuccessExample {json} Success-Response:
   *  {
   *  "meta": {
   *    "id": 2000000000,
   *    "name": "Region II (Cagayan Valley)",
   *    "type": 1,
   *    "NAME_0": "Philippines",
   *    "NAME_1": "Region II (Cagayan Valley)",
   *    "ID_1_OR": 2000000000
   *  },
   *  "adminAreas": [
   *    {
   *      "name": "Batanes",
   *      "id": "2110000000"
   *    },
   *    ...
   *  ]}
   */

  {
    method: 'GET',
    path: '/subregions/{id}',
    handler: function (req, res) {
      var id = +(req.params.id || '');

      getAdminBoundary(id)
      .then(function (boundary) {
        return listSubregions(boundary.adminType, id, boundary)
        .then(function (subregions) {

          var response = {
            meta: {
              id: id,
              name: boundary.name,
              type: boundary.adminType
            },
            adminAreas: subregions
          };

          // Some dirty work to strip what we don't need
          // just to make it cleaner.
          var keysToKeep;
          switch(boundary.adminType) {
            case 1:
              keysToKeep = ['NAME_0', 'NAME_1', 'ID_1_OR'];
            break;
            case 2:
              keysToKeep = ['NAME_0', 'NAME_1', 'ID_1_OR', 'NAME_2', 'ID_2_OR'];
            break;
            case 3:
              keysToKeep = ['NAME_0', 'NAME_2', 'ID_2_OR', 'NAME_3', 'ID_3_OR'];
            break;
            case 4:
              keysToKeep = ['NAME_0', 'NAME_2', 'NAME_3', 'NAME_4', 'ID_4_OR'];
            break;
          }

          _.forEach(keysToKeep, function(key) {
            response.meta[key] = boundary.properties[key];
          });

          // In the case of municipalities and barangay the region is not on the
          // data. We need a new query.
          switch(boundary.adminType) {
            case 4:
              // Barangays don't have the ids in the response, but they can be
              // easily computed.
              response.meta.ID_2_OR = parseInt((id + '').slice(0, -7) + '0000000', 10);
              response.meta.ID_3_OR = parseInt((id + '').slice(0, -3) + '000', 10);
            case 3:
              response.meta.ID_1_OR = parseInt((id + '').slice(0, -9) + '000000000', 10);
              // Get the region name both for municipalities and barangay. 
              getAdminBoundary(response.meta.ID_1_OR).then(function (reg) {
                response.meta.NAME_1 = reg.properties.NAME_1;
                return res(response);
              });
            break;
            default:
              return res(response);
            break;
          }

        });
      })
      .catch(function (err) {
        res(Boom.wrap(err));
      });
    }
  },
  /**
   * @api {get} /admin/:id Get boundaries and road data of subregions
   * @apiGroup Administrative areas
   * @apiName GetAdmin
   * @apiDescription This endpoint returns the boundaries of the subregions
   * in the given administrative area, as well as the roads clipped to the region.
   * The results are returned in GeoJSON.
   * @apiVersion 0.1.0
   *
   * @apiParam {Number} id Municipality or Barangay ID.
   * 
   * @apiSuccess {GeoJSON} subregions List of subregion boundaries
   * @apiSuccess {GeoJSON} roads  List of roads clipped to subregion
   *
   * @apiExample {curl} Example Usage: 
   *    curl http://localhost:4000/admin/2110147000
   *
   * @apiSuccessExample {json} Success-Response:
   *  {
   *  "subregions": {
   *    "type": "FeatureCollection",
   *    "properties": {
   *      "ID_0": 177,
   *      "ISO": "PHL",
   *      "NAME_0": "Philippines",
   *      "ID_2_OR": 2110000000,
   *      "NAME_2": "Batanes",
   *      "ID_3_OR": 2110147000,
   *      ...
   *      }
   *    },
   *    "features": [{
   *      "type": "Feature",
   *      "properties": {
   *        "ISO": "PHL",
   *        "NAME_0": "Philippines",
   *        "NAME_2": "Batanes",
   *        "NAME_3": "Basco",
   *        "NAME_4": "Chanarian",
   *          ...
   *        "ID_4_OR": 2110147001
   *      },
   *      "geometry": {
   *      "type": "Polygon",
   *      "coordinates": [[[121.95786285400389, 20.432300567627006],
   *              ...]]
   *      },
   *      "id": "2110147001",
   *      "name": "Chanarian", 
   *      },
   *    ...]
   *    },
   *    "roads": {
   *      "type":"FeatureCollection",
   *      "properties": {...},
   *      "features": [...]
   *    }
   *  }
  
   */

  {
    method: 'GET',
    path: '/admin/{id}',
    handler: function (req, res) {

      var id = +(req.params.id || '');

      getAdminBoundary(id)
      .then(function (boundary) {
        return getSubregionFeatures(boundary.adminType, id, boundary)
        .then(function (subregions) {
          return queryPolygon(boundary)
          .then(function(roads) {
            res({
              subregions: subregions,
              roads: roads
            });
          });
        });
      })
      .catch(function (err) {
        res(Boom.wrap(err));
      });
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
          res(data);
        });
    }
  }
];
