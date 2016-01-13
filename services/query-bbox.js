'use strict';
var _ = require('lodash');
var Promise = require('bluebird');
var Boom = require('boom');
var QuadTile = require('../services/quad-tile');
var queryWays = require('./query-ways');
var chunk = require('./chunk');
var log = require('./log');
var performance = require('./performance');

// Helper function to flatten nested loops
// and filter out any empties.
function flatten (nested) {
  return _.flatten(nested.filter(function (arr) {
    return arr.length;
  }));
}

function combineChunkedWays (chunks) {
  var roads = {};
  Object.keys(chunks[0]).forEach(function (key) {
    roads[key] = chunks.reduce(function (a, b) {
      return a.concat(b[key]);
    }, []);
  });
  return roads;
}

module.exports = function queryBbox(knex, bbox) {

  function queryNodes (tiles) {
    return knex('current_nodes')
      .whereIn('tile', tiles)
      .where('visible',true)
      .select('id');
  }

  function queryWayNodes (nodes) {
    return knex('current_way_nodes')
      .whereIn('node_id', nodes)
      .select('way_id');
  }

  // Calculate the tiles within this bounding box.
  // See services/QuadTile.js.
  var tiles = QuadTile.tilesForArea(bbox);

  if(bbox.error) return Promise.reject(Boom.badRequest(bbox.error));

  // Querying tiles in chunks is useful when doing big
  // queries, and doesn't affect smaller ones.
  // For those larger ones, we want to run some timers.
  var last = null;
  var chunkedTiles = chunk(tiles);
  if (chunkedTiles.length > 1) {
    last = new Date();
  }

  return Promise.map(chunkedTiles, queryNodes, {concurrency: 1})
    .then(flatten)
    .then(function (nodes) {
      last = performance.log(last, 'query-bbox#queryNodes');
      return Promise.map(chunk(_.pluck(nodes, 'id')), queryWayNodes, {concurrency: 1})
    })
    .then(flatten)
    .then(function (wayIds) {
      last = performance.log(last, 'query-bbox#queryWayNodes');
      wayIds = _.uniq(_.pluck(wayIds, 'way_id'));
      return Promise.map(chunk(wayIds, 500), function (wayIds) {
        return queryWays(knex, wayIds);
      }, {concurrency: 1});
    })
    .then(function (chunks) {
      last = performance.log(last, 'query-bbox#queryWays');
      if (chunks.length === 1) {
        return chunks[0];
      }
      // Re-combine the output objects from services/query-way
      return combineChunkedWays(chunks);
    })
    .catch(function (err) {
      log.error(err);
    });
};
