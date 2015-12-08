'use strict';
/*
 * Model for Relations
 *
 * Schema http://chrisnatali.github.io/osm_notes/osm_schema.html#relations
 *
 */

var _ = require('lodash');
var Boom = require('boom');
var Promise = require('bluebird');

var knex = require('../connection.js');
var Member = require('./relation-member.js');
var RelationTag = require('./relation-tag.js');
var log = require('../services/log');

var Relation = {

  tableName: 'current_relations',

  attributes: {
    id: {
      type: 'integer',
      autoIncrement: true,
      unique: true,
      primaryKey: true,
      index: true
    },
    version: {
      type: 'integer',
      numeric: true,
      required: true
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
    redaction_id: {
      type: 'integer',
      numeric: true
    }
  },


  fromEntity: function(entity, meta) {
    var model = {};
    model.visible = (entity.visible !== 'false' && entity.visible !== false);
    model.version = parseInt(entity.version, 10) || 1;
    model.timestamp = new Date();

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
  },

  subquery: function(entities, ids, map, transaction) {
    var tags = [];
    var members = [];
    for (var i = 0, ii = entities.length; i < ii; ++i) {

      // This is the original change object.
      // We use this to retrieve #tag and #member
      var change = entities[i];
      var id = ids[i];
      if (change.tag && change.tag.length) {
        tags.push(change.tag.map(function(tag) {
          return {
            k: tag.k,
            v: tag.v,
            relation_id: id
          };
        }));
      }

      // Not sure if you can create a relation without
      // at least one member, so check if it's there.
      if (change.member && change.member.length) {
        members.push(change.member.map(function(member, i) {

          // We can use the map variable to get the newly-created entity ID
          // if the one that came from the editor is a negative value.
          if (parseInt(member.ref, 10) < 0) {
            member.ref = map[member.type][member.ref];
          }
          member.relation = id;
          member.i = i;
          return Member.fromEntity(member);
        }));
      }
    }

    var subquery = [];
    if (members.length) {
      subquery.push(transaction(Member.tableName).insert(_.flatten(members)).catch(function(err) {
        log.error('Creating relation members', err);
        throw new Error(err);
      }));
    }
    if (tags.length) {
      subquery.push(transaction(RelationTag.tableName).insert(_.flatten(tags)).catch(function(err) {
        log.error('Creating relation tags', err);
        throw new Error(err);
      }));
    }

    return subquery;
  },

  destroyDependents: function(transaction, ids) {
    return Promise.all([
      transaction(Member.tableName).whereIn('relation_id', ids).del(),
      transaction(RelationTag.tableName).whereIn('relation_id', ids).del()
    ]).catch(function(err) {
      log.error('Destroying relation tags and members', err);
    })
  },

  query: {
    create: function(changeset, meta, map, transaction) {
      var creates = changeset.create.relation;
      if (!creates) {
        return [];
      }

      var models = creates.map(function(entity) {
        return Relation.fromEntity(entity, meta);
      });

      // Bundle all the relation insertions.
      // Then do both the members and tags together.
      var query = transaction(Relation.tableName)
      .insert(models)
      .returning('id')
      .then(function(ids) {

        // Although we don't need the new IDs in the changeset,
        // it's useful to return a map of new IDs in the final response
        // for testing purposes.
        creates.forEach(function(change, i) {
          map.relation[change.id] = ids[i];
        });

        // Use the changeset and new IDs to retrieve the members and tags.
        // Pass along the map object to retrieve new member IDs.
        // This returns an array of promises.
        var subquery = Relation.subquery(creates, ids, map, transaction);
        if (subquery.length) {
          return Promise.all(subquery);
        } else return
      })

      query.catch(function(err) {
        log.error('Inserting new relations', err);
        throw new Error(err);
      });

      return query;
    },

    modify: function(changeset, meta, map, transaction) {
      var modifies = changeset.modify.relation;
      if (!modifies) {
        return [];
      }

      // Creates a list of modification queries.
      var relationChanges = modifies.map(function(entity) {
        var model = Relation.fromEntity(entity, meta);
        return transaction(Relation.tableName)
        .where({ id: entity.id })
        .update(model)
        .catch(function(err) {
          log.error('Modify single relation', err);
          throw new Error(err);
        });
      });

      var ids = _.pluck(modifies, 'id');
      var subquery = Relation.subquery(modifies, ids, map, transaction);
      var query = Promise.all(relationChanges).then(function() {
        return Relation.destroyDependents(transaction, ids).then(function() {
          if (subquery.length) {
            return Promise.all(subquery);
          } else return
        });
      });

      return query;
    },

    // TODO this destroy function does not implement a check
    // to see if any relation is a part of any other relation.
    destroy: function(changeset, meta, map, transaction) {
      var destroys = changeset.delete.relation;
      if (!destroys) {
        return [];
      }
      var ids = _.pluck(destroys, 'id');
      var query = transaction(Relation.tableName).whereIn('id', ids).update({
        visible: false,
        changeset_id: meta.id
      }).returning('id').then(function(removed) {
        return Relation.destroyDependents(transaction, removed).then(function() {
          // log.info('Relations set invisible', removed.join(', '));
        });
      })
      .catch(function(err) {
        log.error('Deleting relations in delete', err);
        throw new Error(err);
      });
      return query;
    }
  }
};

module.exports = Relation;
