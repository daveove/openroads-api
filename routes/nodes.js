'use strict';
var Boom = require('boom');
var Promise = require('bluebird');

var knex = require('../connection.js');
var XML = require('../services/xml.js');
var Node = require('../models/node-model.js');

module.exports = {
  /**
   * @api {get} /xml/node/:id Get node by Id
   * @apiGroup Features
   * @apiName XmlNode 
   * @apiDescription Returns OSM XML of requested Node.
   * @apiVersion 0.1.0
   *
   * @apiParam {Number} nodeId Node ID.
   *
   * @apiSuccess {XML} node Node
   * @apiSuccess {String} node.id Entity ID
   * @apiSuccess {String} node.visible Whether entity can be rendered
   * @apiSuccess {String} node.version Number of edits made to this entity
   * @apiSuccess {String} node.changeset Most recent changeset
   * @apiSuccess {String} node.timestamp Most recent edit
   * @apiSuccess {String} node.user User that created entity
   * @apiSuccess {String} node.uid User ID that created entity
   * @apiSuccess {String} node.lat Entity latitude
   * @apiSuccess {String} node.lon Entity longitude
   *  
   * @apiExample {curl} Example Usage: 
   *    curl http://localhost:4000/xml/node/74038
   *  
   * @apiSuccessExample {xml} Success-Response:
   *  <osm version="6" generator="OpenRoads">
   *    <node id="74038" visible="true" 
   *      version="1" changeset="0" 
   *      timestamp="Wed Mar 11 2015 09:38:41 GMT+0000 (UTC)" 
   *      user="OpenRoads" uid="1" 
   *      lat="9.5820416" lon="123.8162931"/>
   *  </osm>
   */
  method: 'GET',
  path: '/xml/node/{nodeId}',
  handler: function (req, res) {
    var nodeId = parseInt(req.params.nodeId || '', 10);
    if (!nodeId || isNaN(nodeId)) {
      return res(Boom.badRequest('Node ID must be a non-zero number'));
    }

    Promise.all([
      knex.select('current_nodes.*', 'users.display_name as user', 'users.id as uid')
        .from('current_nodes')
        .leftJoin('changesets', 'current_nodes.changeset_id', 'changesets.id')
        .leftJoin('users', 'changesets.user_id', 'users.id')
        .where('current_nodes.id', nodeId),
      knex('current_node_tags').where('node_id', nodeId)
    ])
    .then(function (result) {
      var xmlDoc = XML.write({
        nodes: Node.withTags(result[0], result[1], 'node_id'),
      });
      var response = res(xmlDoc.toString());
      response.type('text/xml');
    })
    .catch(function (err) {
      console.log(err);
      res(Boom.wrap(err));
    });
  }
};
