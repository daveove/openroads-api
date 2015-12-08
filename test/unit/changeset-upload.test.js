'use strict';
var _ = require('lodash');
var knex = require('../../connection.js');
var mocks = require('./fixtures/changesets.js');
var XML = require('../../services/xml.js');

var Node = require('./helpers/create-node.js');
var Way = require('./helpers/create-way.js');
var Relation = require('./helpers/create-relation.js');
var Change = require('./helpers/create-changeset.js');
var test = require('./helpers/server-test.js');

var log = require('../../services/log.js');

function makeNodes(ii) {
  var nodes = [];
  for (var i = 0; i < ii; ++i) {
    nodes.push(new Node({ id: -(i+1) }));
  }
  return nodes;
}

describe('changeset upload endpoint', function() {

  var cs = new Change();

  beforeEach(function() {
    cs.wipe();
  });

  it('Creates 1 node', function(done) {
    cs.create('node', new Node());
    test(cs.get(), done);
  });

  it('Creates 500 nodes', function(done) {
    var nodes = makeNodes(500);
    cs.create('node', nodes);
    test(cs.get(), done);
  });

  it('Creates 1 node and 1 node tag', function(done) {
    cs.create('node', new Node().tags({k: 'howdy', v: 'test'}));
    test(cs.get(), done);
  });

  it('Creates 1 way with 500 nodes and 50 tags', function(done) {
    var nodes = makeNodes(500);
    var way = new Way().nodes(nodes);
    for (var i = 0; i < 50; ++i) {
      way.tags({ k: 'happy' + i, v: 'testing' + i });
    }
    cs.create('node', nodes).create('way', way);
    test(cs.get(), done);
  });

  it('Creates 5 ways with 500 nodes', function(done) {
    var nodes = makeNodes(500);
    var ways = [
      new Way({ id: -1 }).nodes(nodes.slice(0,100)),
      new Way({ id: -2 }).nodes(nodes.slice(101,200)),
      new Way({ id: -3 }).nodes(nodes.slice(201,300)),
      new Way({ id: -4 }).nodes(nodes.slice(301,400)),
      new Way({ id: -5 }).nodes(nodes.slice(401,499))
    ];
    cs.create('node', nodes).create('way', ways);
    test(cs.get(), done);
  });

  it('Creates 5 nodes, 1 way, and 1 relation', function(done) {
    var nodes = makeNodes(5);
    var way = new Way().nodes(nodes);
    var relation = new Relation().members('node', nodes).members('way', way);
    cs.create('node', nodes).create('way', way).create('relation', relation);
    test(cs.get(), done);
  });

  it('Modifies 1 node', function(done) {
    knex('current_nodes').where('changeset_id', 1).then(function(nodes) {
      cs.modify('node', new Node(nodes[0]));
      test(cs.get(), done);
    });
  });

  it('Modifies up to 50 nodes', function(done) {
    knex('current_nodes').where('changeset_id', 1).then(function(nodes) {
      var newNodes = [];
      var modified = 0;
      nodes = nodes.slice(0,50);
      nodes.forEach(function(node) {
        if (node) {
          modified += 1;
          newNodes.push(new Node(node));
        }
      });
      log.info('Modifying ' + modified + ' nodes');
      cs.modify('node', newNodes);
      test(cs.get(), done);
    });
  });

  it('Creates 500 nodes, Modifies a way with 500 nodes', function(done) {
    knex('current_ways').where('changeset_id', 1).then(function(ways) {
      var nodes = makeNodes(500);
      var way = new Way(ways[0]).nodes(nodes);
      cs.create('node', nodes).modify('way', way);
      test(cs.get(), done);
    });
  });

  it('Creates 500 nodes, modifies up to 10 ways', function(done) {
    knex('current_ways').where('changeset_id', 1).then(function(ways) {
      ways = ways.slice(0,10);
      var nodes = makeNodes(500);
      var newWays = [];
      var modified = 0;
      ways.forEach(function(way) {
        if (way) {
          modified += 1;
          newWays.push(new Way(way).nodes(nodes));
        }
      });
      log.info('Modifying ' + modified + ' ways');
      cs.create('node', nodes).modify('way', newWays);
      test(cs.get(), done);
    });
  });

  it('Modifies a relation', function(done) {
    knex('current_relations').where('changeset_id', 1).then(function(relations) {
      var nodes = makeNodes(150);
      var relation = new Relation({ id: relations[0].id }).members('node', nodes);
      cs.create('node', nodes).modify('relation', relation);
      test(cs.get(), done);
    });
  });

  it('Deletes 1 node', function(done) {
    knex('current_nodes').where('changeset_id', 1).then(function(nodes) {
      cs.delete('node', new Node(nodes[0]));
      test(cs.get(), done);
    });
  });

  it('Deletes 1 way', function(done) {
    knex('current_ways').where('changeset_id', 1).then(function(ways) {
      cs.delete('node', new Way(ways[0]));
      test(cs.get(), done);
    });
  });

  it('Deletes up to 500 nodes', function(done) {
    knex('current_nodes').where('changeset_id', 1).then(function(nodes) {
      nodes = nodes.slice(0, 500);
      cs.delete('node', nodes);
      test(cs.get(), done);
    });
  });

  it('Deletes 1 relation', function(done) {
    knex('current_relations').where('changeset_id', 1).then(function(relations) {
      relations = relations[0];
      cs.delete('relation', relations);
      test(cs.get(), done);
    });
  });

  it('Increments the number of changes', function(done) {
    knex('changesets').where('id', 1).then(function(changeset) {
      var nodes = makeNodes(15);
      var way = new Way().nodes(nodes);
      var relation = new Relation().members('node', nodes);
      cs.create('node', nodes);
      cs.create('way', way);
      cs.create('relation', relation);
      test(cs.get(), null, function(res) {
        var oldChanges = changeset[0].num_changes;
        var newChanges = res.result.changeset.num_changes;
        (newChanges).should.be.equal(oldChanges + 15 + 1 + 1);
        done();
      });
    });
  });

  it('Returns the modified IDs of newly-created elements', function(done) {
    var nodes = makeNodes(3);
    var way = new Way().nodes(nodes);
    var relation = new Relation().members('node', nodes);
    cs.create('node', nodes);
    cs.create('way', way);
    cs.create('relation', relation);
    test(cs.get(), null, function(res) {
      var created = res.result.created;
      created.node.should.have.property('-3');
      created.way.should.have.property('-1');
      created.relation.should.have.property('-1');
      done();
    });
  });
});
