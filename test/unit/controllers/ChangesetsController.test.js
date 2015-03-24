var request = require('supertest');
var mocks = require('../helpers/changesets');

describe('ChangesetsController', function() {
  var id = -1;

  describe('#create', function() {

    // TODO complete this test once we have a mock DB.
    /*
    describe('#create', function() {
      it('Creates a user and changeset tag', function(done) {
        request(sails.hooks.http.app)
        .post('/changesets/create')
        .set('Accept', 'application/json')
        .send({
        })
        .expect(200)
        .end(function(err, res) {
        });
      });
    });
    */

  });

  describe('#upload',function() {
    it('Creates a node', function(done) {
      request(sails.hooks.http.app)
      .post('/changesets/upload')
      .set('Accept', 'application/json')
      .query({'changeset_id': 1})
      .send({'xmlString': mocks.createNode(-1)})
      .expect(200)
      .end(function(err, res) {
        if (err) {
          sails.log.debug(res.error.text)
          return done(err)
        }
        id = parseInt(JSON.parse(res.text).actions[0].id)
        done()
      })
    });

    it('Modifies a node', function(done) {
      request(sails.hooks.http.app)
      .post('/changesets/upload')
      .set('Accept', 'application/json')
      .query({'changeset_id': 1})
      .send({'xmlString': mocks.modifyNode(id)})
      .expect(200)
      .end(function(err, res) {
        if (err) {
          sails.log.debug(res.error.text)
          return done(err)
        }
        done()
      })
    });

    it('Deletes a node', function(done) {
      request(sails.hooks.http.app)
      .post('/changesets/upload')
      .set('Accept', 'application/json')
      .query({'changeset_id': 1})
      .send({'xmlString': mocks.deleteNode(id)})
      .expect(200)
      .end(function(err, res) {
        if (err) {
          sails.log.debug(res.error.text)
          return done(err)
        }
        done()
      })
    });

    var node1, node2, node3, way;
    it('Creates 3 nodes and a way with 2 tags', function(done) {
      request(sails.hooks.http.app)
        .post('/changesets/upload')
        .set('Accept', 'application/json')
        .query({'changeset_id': 1})
        .send({'xmlString': mocks.createWay})
        .expect(200)
        .end(function(err, res) {
          if (err) {
            sails.log.debug(res.error.text)
            return done(err)
          }
          //set the ids for later tests;
          var retActions = JSON.parse(res.text).actions
          node1 = parseInt(retActions[0].id)
          node2 = parseInt(retActions[1].id)
          node3 = parseInt(retActions[2].id)
          way = parseInt(retActions[3].id)
          done()
        })
    });

    it('Modifies a way', function(done) {
      request(sails.hooks.http.app)
      .post('/changesets/upload')
      .set('Accept', 'applications/json')
      .query({'changeset_id': 1})
      .send({'xmlString': mocks.modifyWay(node1, node2, node3, way)})
      .expect(200)
      .end(function(err, res) {
        if (err) {
          sails.log.debug(res.error.text)
          return done(err)
        }
        done()
      })
    });

  })
})
