'use strict';
var Area = require('./helpers/create-area');
var Node = require('./helpers/create-node');
var Change = require('./helpers/create-changeset');
var serverTest = require('./helpers/server-test');

var testChangeset = new serverTest.testChangeset();
var get = serverTest.createGet('/openroads/mpas');

describe('Area retrieval endpoint', function () {
  after(function (done) {
    testChangeset.remove()
      .then(function () {
        return done();
      })
      .catch(done);
  });

  before('Create areas', function (done) {
    testChangeset.create()
      .then(function (changesetId) {
        // Area 1:
        var nodes1 = [
          new Node({id: -100, lat: 9.5779114 , lon: 123.8365824, changeset: changesetId}),
          new Node({id: -101, lat: 9.5779114 , lon: 123.8473113, changeset: changesetId}),
          new Node({id: -102, lat: 9.5710983 , lon: 123.8475902, changeset: changesetId}),
        ];
        var a1 = new Area({changeset: changesetId, id: 1}).nodes(nodes1).tags({k: 'protect_type', v: 'marine_area'});
        // Area 2:
        var nodes2 = [
          new Node({id: -103, lon: 123.8465499, lat: 9.5871737, changeset: changesetId}),
          new Node({id: -104, lon: 123.8481783, lat: 9.5807511, changeset: changesetId}),
          new Node({id: -105, lon: 123.8594856, lat: 9.5815475, changeset: changesetId}),
          new Node({id: -106, lon: 123.8590297, lat: 9.5832046, changeset: changesetId}),
          new Node({id: -107, lon: 123.8518128, lat: 9.5837184, changeset: changesetId}),
          new Node({id: -108, lon: 123.8509139, lat: 9.5878416, changeset: changesetId})
        ];
        var a2 = new Area({changeset: changesetId, id: 2}).nodes(nodes2).tags({k: 'protect_type', v: 'marine_area'});

        var cs = new Change();
        cs.create('node', nodes1.concat(nodes2)).create('way', [a1, a2]);

        testChangeset.upload(cs.get())
          .then(function(res) {
            return done();
          })
          .catch(done);
      })
      .catch(done);
  });

  it('Returns all MPAs', function (done) {
    get('').then(function (res) {
      var result = res.result;
      result.features.should.have.length(2);
      result.type.should.equal('FeatureCollection');
      result.features[0].properties.area.should.equal('true'); 
      result.features[0].properties.protect_type.should.equal('marine_area');
      done();
    })
    .catch(done);
  });

  it('Returns one MPA by id', function (done) {
    get('/' + 1).then(function (res) {
      var result = res.result;
      result.type.should.equal('Feature');
      result.properties.area.should.equal('true');
      result.properties.id.should.equal(1);
      result.properties.protect_type.should.equal('marine_area');
      done();
    })
    .catch(done);
  });

  it('Returns MPAs ordered by proximity to coord', function (done) {
    get('/near/123.84145259857176,9.58668014685045').then(function (res) {
      var result = res.result;
      result.features.should.have.length(2);
      result.type.should.equal('FeatureCollection');
      result.features[0].properties.id.should.equal(2); 
      result.features[1].properties.id.should.equal(1); 
      done();
    })
    .catch(done);
  });

  it('Returns MPAs ordered by proximity to coord limiting to 1', function (done) {
    get('/near/123.84145259857176,9.58668014685045?limit=1').then(function (res) {
      var result = res.result;
      result.features.should.have.length(1);
      result.type.should.equal('FeatureCollection');
      result.features[0].properties.id.should.equal(2);
      done();
    })
    .catch(done);
  });

  it('Returns MPAs that contain a coordinate. 0 in this case', function (done) {
    get('/contain/123.84145259857176,9.58668014685045').then(function (res) {
      var result = res.result;
      result.features.should.have.length(0);
      result.type.should.equal('FeatureCollection');
      done();
    })
    .catch(done);
  });

  it('Returns the MPA that contains the coordinates', function (done) {
    get('/contain/123.84437,9.576').then(function (res) {
      var result = res.result;
      result.features.should.have.length(1);
      result.type.should.equal('FeatureCollection');
      result.features[0].properties.id.should.equal(1);
      done();
    })
    .catch(done);
  });

  it('Returns MPAs that contain a coordinate in a radius of 1km', function (done) {
    get('/contain/123.84145259857176,9.58668014685045?radius=1').then(function (res) {
      var result = res.result;
      result.features.should.have.length(2);
      result.type.should.equal('FeatureCollection');
      done();
    })
    .catch(done);
  });

  it('Returns the MPA with the given ID if it contains the coordinates', function (done) {
    get('/' + 1 + '/contain/123.84437,9.576').then(function (res) {
      var result = res.result;
      result.type.should.equal('Feature');
      result.properties.area.should.equal('true');
      result.properties.id.should.equal(1);
      result.properties.protect_type.should.equal('marine_area');
      done();
    })
    .catch(done);
  });

  it('Returns empty object as the MPA with given ID does not contains the coordinates', function (done) {
    get('/' + 2 + '/contain/123.84437,9.576').then(function (res) {
      var result = res.result;
      result.should.be.empty;
      done();
    })
    .catch(done);
  });
});