'use strict';
/**
 * Nodes.js
 *
 * @description :: Represents nodes.
 * Schema: http://chrisnatali.github.io/osm_notes/osm_schema.html#current_nodes
 *
 */

var _ = require('lodash');
var Boom = require('boom');
var Promise = require('bluebird');

var knex = require('../connection.js');
var log = require('../services/log.js');
var RATIO = require('../services/ratio.js');
var QuadTile = require('../services/quad-tile.js');
var NodeTag = require('./node-tag.js');
var WayNode = require('./way-node.js');
var Way = require('./way.js');

var Node = {

  tableName: 'current_nodes',

  attributes: {
    id: {
      type: 'integer',
      autoIncrement: true,
      unique: true,
      primaryKey: true,
      index: true
    },
    latitude: {
      type: 'integer',
      required: true,
      numeric: true,
      truthy: true
    },
    longitude: {
      type: 'integer',
      required: true,
      numeric: true,
      truthy: true
    },
    changeset_id: {
      type: 'integer',
      numeric: true,
      model: 'changesets'
    },
    visible: {
      type: 'boolean',
      boolean: true
    },
    timestamp: {
      type: 'datetime',
      datetime: true
    },
    tile: {
      type: 'integer',
      index: true,
      numeric: true,
      required: true
    },
    version: {
      type: 'integer',
      numeric: true,
      required: true
    },
  },

  fromEntity: function(entity, meta) {
    var ratio = RATIO;
    var model = {};
    model.visible = (entity.visible !== 'false' && entity.visible !== false);
    model.version = parseInt(entity.version, 10) || 1;
    model.timestamp = new Date();
    if (entity.lat && entity.lon) {
      entity.lat = parseFloat(entity.lat);
      entity.lon = parseFloat(entity.lon);
      model.latitude = entity.lat * ratio | 0;
      model.longitude = entity.lon * ratio | 0;
      model.tile = QuadTile.xy2tile(QuadTile.lon2x(entity.lon), QuadTile.lat2y(entity.lat));
    }

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

  // Return an entity from a JSON node.
  fromOSM: function(xml) {

    // Transfer all attributes.
    var model = {};
    var attributes = xml.attrs();
    for (var i = 0, ii = attributes.length; i < ii; ++i) {
      var attr = attributes[i];
      model[attr.name()] = attr.value();
    }

    // Transfer tags.
    var children = xml.childNodes();
    var tags = [];
    for (var i = 0, ii = children.length; i < ii; ++i) {
      var t = children[i];
      if (t.name() === 'tag') {
        tags.push({
          k: t.attr('k'),
          v: t.attr('v')
        });
      }
    }
    model.tag = tags;
    return model
  },

  canBeDeleted: function(nodeId) {
    // No need to call parseInt on node_id, as that's already handled upstream.
    return knex(WayNode.tableName)
    .where('node_id', nodeId)
    .then(function wayNodeResp(wayNodes) {
      // If this node belongs to a way, check to see if
      // any of those ways are visible, aka not deleted yet.
      // Return false if this node is still part of an existing way.
      if (wayNodes) {
        return knex(Way.tableName).whereIn('id',_.pluck(wayNodes, 'way_id'))
        .then(function(ways) {
          var visible = _.chain(ways)
          .pluck('visible')
          .reduce(function(curr, val) { return curr && val; }, true)
          .value();
          return visible;
        });
      } else {
        return true;
      }
    })
    .catch(function(err) {
      throw new Error(err);
    });
  },

  // Attach a list of tags to a list of entities
  // by creating a mapping of entities by their id.
  withTags: function(entities, tags, accessor) {
    if (!tags.length) {
      return entities;
    }
    var map = {};
    for(var i = 0, ii = entities.length; i < ii; ++i) {
      var entity = entities[i];
      map[entity.id] = entity;
    }
    for(i = 0, ii = tags.length; i < ii; ++i) {
      var tag = tags[i];
      var entity = map[tag[accessor]];
      if (entity) {
        if (entity.tags === undefined) {
          entity.tags = [];
        }
        entity.tags.push(tag);
      }
    }
    return entities;
  },

  // Generate create, modify, and destroy queries.
  // Using as few connections as possible.
  query: {
    create: function(changeset, meta, map, transaction) {
      var creates = changeset.create.node;
      if (!creates) {
        return [];
      }

      // Map each node creation to a model with proper attributes.
      var models = creates.map(function(entity) {
        return Node.fromEntity(entity, meta);
      });

      // Insert all node models, then use returned ids to insert all tags.
      var query = transaction(Node.tableName).insert(models).returning('id').then(function(ids) {
        var tags = [];
        for (var i = 0, ii = creates.length; i < ii; ++i) {

          // We need to take the original object from the changeset query here.
          // It contains node tags.
          var change = creates[i];

          // Re-map the old node ID to the new node ID on the map object.
          map.node[change.id] = ids[i];

          // Overwrite old ID's with new Node ID's on the changeset.
          // This assumes that ID's returned from postgresql maintain the same order
          // that they are inserted in.
          change.id = ids[i];

          // Check for Node tags. If they exist, they will be in the form of an array.
          if (change.tag && change.tag.length) {
            tags.push(change.tag.map(function(tag) {
              return {
                k: tag.k,
                v: tag.v,
                node_id: change.id
              };
            }));
          }
        }

        // Only save tags if there are any.
        if (tags.length) {
          tags = [].concat.apply([], tags);
          return transaction(NodeTag.tableName).insert(tags).catch(function(err) {
            log.error('Creating node tags in create', err);
            throw new Error(err);
          });
        }
        else return
      })
      .catch(function(err) {
        log.error('Inserting new nodes in create', err);
        throw new Error(err);
      });
      return query;
    },

    modify: function(changeset, meta, map, transaction) {
      var modifies = changeset.modify.node;
      if (!modifies) {
        return [];
      }

      // Create a list of modify queries.
      // TODO so far as I know, there's no way to bulk-modify a bunch of records.
      // So set up a list of all of them that we can call Promise.all() on.
      var nodeChanges = modifies.map(function(entity) {

        // Create a new model object with the proper attributes.
        var model = Node.fromEntity(entity, meta);
        var query = transaction(Node.tableName).where({id: entity.id}).update(model).catch(function(err) {
          log.error('Modify single node', err);
          throw new Error(err);
        });
        return query;
      });

      // We'll need all the Node IDs to delete it's way tags.
      // Since we're looping over the modify object, record all the
      // new node tags.
      var ids = [];
      var tags = [];
      for (var i = 0, ii = modifies.length; i < ii; ++i) {
        var change = modifies[i];
        ids.push(parseInt(change.id, 10));
        if (change.tag && change.tag.length) {
          tags.push(change.tag.map(function(tag) {
            return {
              k: tag.k,
              v: tag.v,
              node_id: change.id
            };
          }));
        }
      }

      // Call Promise.all() on the modifications.
      // After that's done, we can safely delete node tags and insert new ones.
      var query = Promise.all(nodeChanges).then(function() {
        return transaction(NodeTag.tableName).whereIn('node_id', ids).del().then(function() {
          if (tags.length) {
            tags = [].concat.apply([], tags);
            return transaction(NodeTag.tableName).insert(tags).catch(function(err) {
              log.error('Creating node tags in modify', err);
              throw new Error(err);
            });
          }
          else return
        }).catch(function(err) {
          log.error('Deleting node tags in modify.', err);
          throw new Error(err);
        });
      }).catch(function(err) {
        log.error('Modifying all nodes.', err);
        throw new Error(err);
      });
      return query;
    },

    destroy: function(changeset, meta, map, transaction) {
      var destroys = changeset.delete.node;
      if (!destroys) {
        return [];
      }
      var ids = _.pluck(destroys, 'id');
      var query = transaction(Node.tableName).whereIn('id', ids).update({
        visible: false,
        changeset_id: meta.id
      }).returning('id').then(function(invisibleNodes) {
        return transaction(NodeTag.tableName).whereIn('node_id', invisibleNodes).del().returning('node_id').then(function(deleted) {
          // log.info('Nodes set invisible', invisibleNodes.join(', '));
          // log.info('Node tags deleted', deleted.join(', '));
        }).catch(function(err) {
          log.error('Deleting node tags in delete', err);
          throw new Error(err);
        });
      })
      .catch(function(err) {
        log.error('Deleting nodes in delete', err);
        throw new Error(err);
      });
      return query;
    }
  },
};

module.exports = Node;

