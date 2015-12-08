'use strict';

/**
* Way.js
*
* @description :: Represents ways, or roads.
* Schema : : http://chrisnatali.github.io/osm_notes/osm_schema.html#current_ways
*
*/

var _ = require('lodash');
var Boom = require('boom');
var Promise = require('bluebird');

var knex = require('../connection.js');
var log = require('../services/log.js');
var Node = require('./node-model.js');
var WayNode = require('./way-node.js');
var WayTag = require('./way-tag.js');

var Way = {
  tableName: 'current_ways',

  attributes: {
    id: {
      type: 'integer',
      autoIncrement: true,
      unique: true,
      primaryKey: true,
      numerical: true
    },
    changeset_id: {
      type: 'integer',
      numeric: true,
      primaryKey: true,
      autoIncrement: true,
      index: true,
      model: 'changesets'
    },
    timestamp: {
      type: 'datetime',
      date: true
    },
    visible: {
      type: 'boolean',
      boolean: true
    },
    version: {
      type: 'integer',
      numeric: true,
      index: true
    },
  },

  fromEntity: function(entity, meta) {
    var model = {};
    model.visible = (entity.visible !== 'false' && entity.visible !== false);
    model.version = parseInt(entity.version, 10) || 1;
    model.timestamp = new Date();

    // Parse int on entity.id, so we can see if it's a negative id.
    var id = parseInt(entity.id, 10);
    if (id && id > 0) {
      model.id = id;
    }
    if (entity.changeset) {
      model.changeset_id = parseInt(entity.changeset, 10);
    }
    else if (meta && meta.id) {
      model.changeset_id = parseInt(meta.id);
    }
    return model;
  },

  fromOSM: function(xml) {

    // Transfer all attributes.
    var model = {};
    var attributes = xml.attrs();
    for (var i = 0, ii = attributes.length; i < ii; ++i) {
      var attr = attributes[i];
      model[attr.name()] = attr.value();
    }

    // Transfer tags and way nodes.
    var children = xml.childNodes();
    var tags = [];
    var nd = [];
    for (var i = 0, ii = children.length; i < ii; ++i) {
      var child = children[i];
      var type = child.name();
      if (type === 'tag') {
        tags.push({
          k: child.attr('k').value(),
          v: child.attr('v').value()
        });
      }
      else if (type === 'nd') {
        nd.push({
          ref: child.attr('ref').value()
        });
      }
    }
    model.tag = tags;
    model.nd = nd;
    return model;
  },

  canBeDeleted: function(way_id) {
    // TODO add relations support
    return new Promise(function(fullfill, reject) {
      fullfill(true)
    })
  },

  attachNodeIDs: function(ways, wayNodes) {
    // For each way, attach every node it contains using the wayNodes server
    //response.
    for (var j = 0, jj = ways.length; j < jj; ++j) {
      var way = ways[j];
      var nodesInWay = [];
      for (var i = 0, ii = wayNodes.length; i < ii; ++i) {
        var wayNode = wayNodes[i];
        if (wayNode.way_id === way.id) {
          nodesInWay.push(wayNode);
        }
      }
      way.nodes = nodesInWay;
    }
    return ways;
  },

  query: {
    create: function(changeset, meta, map, transaction) {
      var creates = changeset.create.way;
      if (!creates) {
        return [];
      }

      // Create a list of models of just way creations with proper attributes.
      var models = creates.map(function(entity) {
        return Way.fromEntity(entity, meta);
      });

      // Bundle all the way insertions, bundle all the way nodes,
      // then bundle all the tag insertions if any.
      var query = transaction(Way.tableName).insert(models).returning('id').then(function(ids) {

        var tags = [];
        var wayNodes = [];
        for (var i = 0, ii = creates.length; i < ii; ++i) {

          // Using the original change object.
          // Contains #nd and #tag.
          var change = creates[i];

          // Map the old way ID to the new ID,
          // so we can support relations later.
          map.way[change.id] = ids[i];

          // Set the new ID onto the changeset object.
          change.id = ids[i];

          // Safe to assume ways will have way nodes.
          // Use the map#node mapping to get the new Node ids.
          wayNodes.push(change.nd.map(function(wayNode, i) {

            // Take the node ID from the attached nd, unless it's less than zero;
            // In which case, use the value saved in map#node
            var nodeId = parseInt(wayNode.ref, 10) > 0 ? wayNode.ref : map.node[wayNode.ref];
            return {
              way_id: change.id,
              sequence_id: i,
              node_id: nodeId
            };
          }));

          if (change.tag && change.tag.length) {
            tags.push(change.tag.map(function(tag) {
              return {
                k: tag.k,
                v: tag.v,
                way_id: change.id
              };
            }));
          }
        }

        // The dependents array will always contain a way node insertion query.
        // If there are way tags, it will include those too.
        var dependents = [];
        wayNodes = [].concat.apply([], wayNodes);
        dependents.push(transaction(WayNode.tableName).insert(wayNodes).returning('node_id').catch(function(err) {
          log.error('Creating way nodes in create', err);
          throw new Error(err);
        }));
        if (tags.length) {
          tags = [].concat.apply([], tags);
          dependents.push(transaction(WayTag.tableName).insert(tags).catch(function(err) {
            log.error('Creating way tags in create', err);
            throw new Error(err);
          }));
        }
        return Promise.all(dependents);
      })
      .catch(function(err) {
        log.error('Inserting new ways', err);
        throw new Error(err);
      });
      return query;
    },

    modify: function(changeset, meta, map, transaction) {
      var modifies = changeset.modify.way;
      if (!modifies) {
        return [];
      }

      // Create a list of modify queries, since we can't do them all in a single query.
      var wayChanges = modifies.map(function(entity) {
        var model = Way.fromEntity(entity, meta);
        var query = transaction(Way.tableName).where({ id: entity.id }).update(model).catch(function(err) {
          log.error('Modify single way', err);
          throw new Error(err);
        });
        return query;
      });

      // Get all of our new tags and wayNodes.
      // Save IDs so we can delete old tags and wayNodes.
      var ids = [];
      var tags = [];
      var wayNodes = [];
      for(var i = 0, ii = modifies.length; i < ii; ++i) {
        var modify = modifies[i];
        ids.push(parseInt(modify.id, 10));
        wayNodes.push(modify.nd.map(function(wayNode, i) {

          // Take the node ID from the attached nd, unless it's less than zero;
          // In which case, use the value saved in map#node
          var nodeId = parseInt(wayNode.ref, 10) > 0 ? wayNode.ref : map.node[wayNode.ref];
          return {
            way_id: modify.id,
            sequence_id: i,
            node_id: nodeId
          }
        }));
        if (modify.tag && modify.tag.length) {
          tags.push(modify.tag.map(function(tag) {
            return {
              k: tag.k,
              v: tag.v,
              way_id: modify.id
            };
          }));
        }
      }

      var query = Promise.all(wayChanges).then(function() {

        // Dependents is an array where each item is a delete().then.insert().
        // It will contain way nodes for certain. It will also contain a delete for tags.
        // If there are new tags, then it will also insert those tags.
        var dependents = [];
        dependents.push(transaction(WayNode.tableName).whereIn('way_id', ids).del().then(function() {
          wayNodes = [].concat.apply([], wayNodes);
          return transaction(WayNode.tableName).insert(wayNodes).catch(function(err) {
            log.error('Creating way nodes in modify', err);
            throw new Error(err);
          });
        })
        .catch(function(err) {
          log.error('Deleting way nodes in modify', err);
          throw new Error(err);
        }));

        // Again, we always delete old way tags, even if we don't have new ones to add.
        dependents.push(transaction(WayTag.tableName).whereIn('way_id', ids).del().then(function() {
          if (tags.length) {
            tags = [].concat.apply([], tags);
            return transaction(WayTag.tableName).insert(tags).catch(function(err) {
              log.error('Creating way tags in modify', err);
              throw new Error(err);
            });
          }
          else return
        })
        .catch(function(err) {
          log.error('Deleting way tags in modify', err);
          throw new Error(err);
        }));
        return Promise.all(dependents);
      });

      return query;
    },

    destroy: function(changeset, meta, map, transaction) {
      var destroys = changeset.delete.way;
      if (!destroys) {
        return [];
      }
      var ids = _.pluck(destroys, 'id');
      var query = transaction(Way.tableName).whereIn('id', ids).update({
        visible: false,
        changeset_id: meta.id
      }).returning('id').then(function(invisibleWays) {
        return Promise.all([
          transaction(WayTag.tableName).whereIn('way_id', invisibleWays).del(),
          transaction(WayNode.tableName).whereIn('way_id', invisibleWays).del()
        ]).then(function() {
          // log.info('Ways set invisible', invisibleWays.join(', '));
        }).catch(function(err) {
          log.error('Deleting way nodes and tags in delete', err);
          throw new Error(err);
        });
      })
      .catch(function(err) {
        log.error('Deleting ways in delete', err);
        throw new Error(err);
      });
      return query;
    }
  }
};

module.exports = Way;

