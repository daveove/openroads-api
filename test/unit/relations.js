'use strict';
var knex = require('../../connection.js');

var Node = require('./helpers/create-node.js');
var Way = require('./helpers/create-way.js');
var Relation = require('./helpers/create-relation.js');
var Change = require('./helpers/create-changeset.js');
var test = require('./helpers/server-test.js');

function makeNodes(ii) {
  var nodes = [];
  for (var i = 0; i < ii; ++i) {
    nodes.push(new Node({ id: -(i+1) }));
  }
  return nodes;
}

function get(url) {
  return server.injectThen({
    method: 'GET',
    url: '/relations' + url
  });
}

describe('Relations endpoint', function() {

  var lockCondition = false;

  var cs = new Change();
  var nodes = makeNodes(5);
  var way = new Way().nodes(nodes);
  var relation = new Relation()
    .members('node', nodes)
    .members('way', way)
    .tags({ k: 'test', v: 'relation_endpoint' });

  cs.create('node', nodes)
    .create('way', way)
    .create('relation', relation);

  it('Should return a valid relation, using a tag search', function(done) {
    test(cs.get(), null, function(create) {
      get('?test=relation_endpoint').then(function(res) {
        res.statusCode.should.eql(200);
        var payload = JSON.parse(res.payload);
        payload[0].should.have.keys('changeset_id', 'tags', 'id', 'timestamp', 'version', 'visible');
        payload[0].tags.should.have.lengthOf(1);
        done();
      }).catch(done);
    });
  });

  it('Should return a valid relation, using a member search', function(done) {
    test(cs.get(), null, function(create) {
      var way = create.result.created.way['-1'];
      var relation = create.result.created.relation['-1'];
      knex('current_relation_members')
      .where('member_id', way).andWhere('member_type', 'Way').then(function(member) {
        member = member[0];
        get('?member=' + member.member_id).then(function(res) {
          res.statusCode.should.eql(200);
          var payload = JSON.parse(res.payload);
          payload[0].should.have.keys('changeset_id', 'tags', 'id', 'timestamp', 'version', 'visible');
          (payload[0].id).should.equal(relation);
          done();
        }).catch(done);
      });
    });
  });

  it('Should return a valid relation, using a relation id', function(done) {
    test(cs.get(), null, function(create) {
      var relation = create.result.created.relation['-1'];
      get('/' + relation).then(function(res) {
        res.statusCode.should.eql(200);
        var payload = JSON.parse(res.payload);
        payload[0].members.should.have.lengthOf(6);
        payload[0].should.have.keys('changeset_id', 'tags', 'id', 'timestamp', 'version', 'visible', 'members');
        payload[0].members.should.have.lengthOf(6);
        done();
      }).catch(done);
    });
  });
});
