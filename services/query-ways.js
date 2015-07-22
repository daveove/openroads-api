'use strict';
var _ = require('lodash');
var Promise = require('bluebird');

module.exports = function queryWays(knex, wayIds) {

  // helper to make raw queries, because knex version of these
  // simple selects was MUCH slower
  function selectWithUserInfo(table, key, ids) {
    if(ids.length === 0)
      return Promise.resolve([]);
    return knex.raw('select a.*, c.display_name as user, c.id as uid from '+table +
      ' a left join changesets b on a.changeset_id = b.id' +
      ' left join users c on b.user_id = c.id ' +
     ' where a.'+key+' in ('+ ids.join(',') + ')')
      .then(function (resp) {
        return resp.rows;
      });
  }

  function select(table, key, ids) {
    if(ids.length === 0)
      return Promise.resolve([]);
    return knex.raw('select * from '+table +
        ' where '+key+' in ('+ ids.join(',') + ')')
        .then(function (resp) {
          return resp.rows;
        });
  }

  // Query the desired ways and any way_nodes that are in those ways
  // Also query any relations that those ways are a part of.

  // TODO this currently does not query nodes that are part of relations,
  // or other relations that are part of relations.

  return Promise.all([
    knex.select('current_ways.*', 'users.display_name as user', 'users.id as uid')
        .from('current_ways')
        .leftJoin('changesets', 'current_ways.changeset_id', 'changesets.id')
        .leftJoin('users', 'changesets.user_id', 'users.id')
        .whereIn('current_ways.id', wayIds),
    knex('current_way_nodes')
      .orderBy('sequence_id', 'asc')
      .whereIn('way_id', wayIds),
    knex('current_relation_members')
      .where('member_type', 'Way')
      .whereIn('member_id', wayIds)
  ])
  .then(function (result) {

    // Now we have all the ways and nodes that we need, so fetch
    // the associated tags.

    var wayIds = _.pluck(result[0], 'id');
    var nodeIds = _(result[1])
      .unique('node_id')
      .pluck('node_id')
      .value();
    var relationIds = _.pluck(result[2], 'relation_id');

    return Promise.all(result.concat([
      selectWithUserInfo('current_nodes', 'id', nodeIds),
      select('current_way_tags', 'way_id', wayIds),
      select('current_node_tags', 'node_id', nodeIds),
      selectWithUserInfo('current_relations', 'id', relationIds),
      select('current_relation_tags', 'relation_id', relationIds)
    ]));
  })
  .then(function (resultArr) {
    var result = {
      ways: resultArr[0],
      waynodes: resultArr[1],
      members: resultArr[2],
      nodes: resultArr[3],
      waytags: resultArr[4],
      nodetags: resultArr[5],
      relations: resultArr[6],
      relationtags: resultArr[7]
    };

    // attach associated nodes and tags to ways
    result.ways.forEach(function (way) {
      way.nodes = result.waynodes.filter(function(waynode) {
        return waynode.way_id === way.id;
      });
      way.tags = result.waytags.filter(function(tag) {
        return tag.way_id === way.id;
      });
    });

    result.relations.forEach(function (relation) {
      relation.members = result.members.filter(function(member) {
        return member.relation_id === relation.id;
      });
      relation.tags = result.relationtags.filter(function(tag) {
        return tag.relation_id === relation.id;
      });
    });

    return result;

  })
      .catch(function (err) {
        console.log(err);
        res(Boom.wrap(err));
      });

};

