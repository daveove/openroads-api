'use strict';

var _ = require('lodash');
var Boom = require('boom');
var Promise = require('bluebird');

var knex = require('../connection.js');
var BoundingBox = require('../services/bounding-box.js');
var log = require('../services/log.js');
var Node = require('../models/node-model.js');
var Way = require('../models/way.js');
var Relation = require('../models/relation.js');

function upload(req, res) {
  var changesetID = req.params.changesetID;
  if (!changesetID || isNaN(changesetID)) {
    res(Boom.badRequest('Changeset ID must be a non-zero number'));
  }
  knex('changesets').where('id', changesetID).then(function(changesets) {
    if (changesets.length === 0) {
      return res(Boom.badRequest('Could not find changeset'));
    }
    var meta = changesets[0];

    // Use changeset in request body.
    var changeset = req.payload.osmChange;
    if (!changeset) {
      log.error('No json or cannot parse req.payload.osmChange');
      return res(Boom.badRequest('Problem reading changeset JSON'));
    }

    // Start a transaction block
    knex.transaction(function(transaction) {

      // Use this to map old ids to new ids.
      var map = {
        node: {},
        way: {},
        relation: {}
      }

      query('node', changeset, meta, map, transaction).then(function() {
        query('way', changeset, meta, map, transaction).then(function() {
          query('relation', changeset, meta, map, transaction).then(function() {

            // Update changeset with new bounding box.
            var updated = updateChangeset(changeset, meta);
            knex('changesets')
            .where('id', meta.id)
            .update(updated)
            .then(function() {
              transaction.commit();
              return res({
                changeset: _.extend({}, meta, updated),
                created: map
              });
            })
            .catch(function(err) {
              log.error('Changeset update fails', err);
              transaction.rollback();
              return res(Boom.badImplementation('Could not update changeset'));
            });
          });
        });
      });

    }).catch(function(err) {
      log.error('Changeset transaction fails', err);
      return res(Boom.badImplementation('Could not complete changeset actions'));
    });
  })
  .catch(function(err) {
    log.error('Changeset not found', err);
    return res(Boom.badRequest('Could not find changeset'));
  });
}

var models = {
  node: Node,
  way: Way,
  relation: Relation
};

function query(entity, changeset, meta, map, transaction) {
  var model = models[entity];
  if (!model) {
    return;
  }
  var actions = ['create', 'modify', 'destroy'].map(function(action) {
    return toArray(model.query[action](changeset, meta, map, transaction));
  });
  return Promise.all(_.flatten(actions)).catch(function(err) {
    log.error(entity + ' changeset fails', err);
    transaction.rollback();
    throw new Error(err);
  });
}

function toArray(val) {
  if (_.isArray(val)) {
    return val;
  }
  return [val];
}

function updateChangeset(changeset, meta) {

  // Keep track of the number of changes this upload operation is doing.
  var numChanges = parseInt(meta.num_changes, 10) || 0;
  var nodes = [];
  ['create', 'modify', 'delete'].forEach(function(action) {
    if (changeset[action].node) {
      nodes.push.apply(nodes, changeset[action].node);
    }
    ['node', 'way', 'relation'].forEach(function(entity) {
      numChanges += changeset[action][entity] ? changeset[action][entity].length : 0;
    });
  });

  var bbox = BoundingBox.fromNodes(nodes).toScaled();
  var changesetUpdate = {
    min_lon: bbox.minLon | 0,
    min_lat: bbox.minLat | 0,
    max_lon: bbox.maxLon | 0,
    max_lat: bbox.maxLat | 0,
    closed_at: new Date(),
    num_changes: numChanges
  };
  return changesetUpdate;
}

module.exports = {
  /**
   * @api {POST} /changeset/:id/upload Upload changeset data
   * @apiGroup Changeset
   * @apiName UploadChangeset
   * @apiDescription Upload JSON Changeset Data to given changeset
   * Return the changeset and a bounding box that covers the location of its
   * edits.
   *
   * The OSM Change JSON Format is the of the form
   * <pre><code>
   * {  <br>
   *   "version": 0.1, <br>
   *   "generator": "iD", <br>
   *   "create": {},  <br>
   *   "modify": {},  <br>
   *   "delete": {}, <br>
   * }
   *</code></pre>
   *
   * Each of the create, modify and delete blocks can contain entities such as Node, Way
   * or Relation. Check the API Usage Example for more detail.
   * @apiVersion 0.1.0
   *
   * @apiParam {Number} id Changeset ID
   * @apiParam {Object} osmChange OSM Changeset Data in JSON
   *
   * @apiSuccess {Object} changeset Changeset object
   * @apiSuccess {String} changeset.id Changeset ID.
   * @apiSuccess {String} changeset.user_id Changeset User ID.
   * @apiSuccess {Date} changeset.created_at Changeset Date of creation.
   * @apiSuccess {Number} changeset.min_lat Min Latitude of bounding box.
   * @apiSuccess {Number} changeset.max_lat Max Latitude of bounding box.
   * @apiSuccess {Number} changeset.min_lon Min Longitude of bounding box.
   * @apiSuccess {Number} changeset.max_lon Max Longitude of bounding box.
   * @apiSuccess {Date} changeset.closed_at Changeset Date of creation.
   * @apiSuccess {number} changeset.num_changes Number of edits in this changeset.
   *
   * @apiExample {curl} Example Usage:
   *  curl -d '{
   *   "osmChange": {
   *     "version":0.1,
   *     "generator":"openroads-iD",
   *     "create":{ },
   *     "modify":{
   *       "node":[
   *         {"id":"21851",
   *          "lon":123.9780018,
   *          "lat":9.7923478,"version":"1", "tag":[],
   *          "changeset":1 }]
   *     },
   *     "delete": {}
   *   }
   *  }' -H 'Content-Type: application/json' http://localhost:4000/changeset/1/upload
   *
   * @apiSuccessExample {json} Success-Response:
   *  {
   *  "changeset":
   *    {
   *     "id":"1",
   *     "user_id":"2254600",
   *     "created_at":"2015-03-13T03:51:39.000Z",
   *     "min_lat":97923478,
   *     "max_lat":97923478,
   *     "min_lon":1239780018,
   *     "max_lon":1239780018,
   *     "closed_at":"2015-04-21T18:44:51.858Z",
   *     "num_changes":31076
   *     },
   *  "created":
   *    {
   *     "node":{
   *       "-1":"743049",
   *       "-2":"743050",
   *       "-3":"743051"
   *       },
   *     "way":{
   *       "-1":"168483"
   *       }
   *     }
   *   }
   */
  method: 'POST',
  path: '/changeset/{changesetID}/upload',
  handler: upload
};
