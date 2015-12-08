'use strict';

var getAdminBoundary = require('../../services/admin-boundary.js');
var getSubregionFeatures = require('../../services/admin-subregions.js').getFeatures;
var queryPolygon = require('../../services/query-polygon.js');

describe('admin subregions endpoint', function() {
  this.slow(5000);

  it('responds with the right schema for the whole country', function(done) {
    server.injectThen({
      method: 'GET',
      url: '/admin/subregions'
    })
    .then(function (resp) {
      var obj = JSON.parse(resp.payload);
      obj.should.have.keys('adminAreas'); // <-- TODO
      done();
    })
    .catch(done);
  });

  it('responds with the right schema for a particular region', function(done) {
    server.injectThen({
      method: 'GET',
      url: '/admin/13000000000/subregions'
    })
    .then(function (resp) {
      var obj = JSON.parse(resp.payload);
      obj.should.have.keys('id', 'name', 'type', 'NAME_0', 'adminAreas');
      done();
    })
    .catch(done);
  });

  it('yields provinces for a region', function(done) {
    server.injectThen({
      method: 'GET',
      url: '/admin/13000000000/subregions'
    })
    .then(function (resp) {
      var obj = JSON.parse(resp.payload);
      obj.id.should.equal(13000000000);
      obj.type.should.equal(1);
      obj.adminAreas.should.have.length(10);
      done();
    })
    .catch(done);
  });

  it('yields municipalities for a province', function(done) {
    server.injectThen({
      method: 'GET',
      url: '/admin/13590000000/subregions'
    })
    .then(function (resp) {
      var obj = JSON.parse(resp.payload);
      obj.id.should.equal(13590000000);
      obj.type.should.equal(2);
      obj.adminAreas.should.have.length(23);
      done();
    })
    .catch(done);
  });

  it('yields barangays for a municipality', function(done) {
    // this also tests getAdminBoundary()
    server.injectThen({
      method: 'GET',
      url: '/admin/13591204000/subregions'
    })
    .then(function (resp) {
      var obj = JSON.parse(resp.payload);
      obj.id.should.equal(13591204000);
      obj.name.should.equal('Dumaran');
      obj.type.should.equal(3);
      obj.adminAreas.should.have.length(16);
      done();
    })
    .catch(done);
  });

  it('responds with code 400 for region subregion boundaries', function(done) {
    server.injectThen({
      method: 'GET',
      url: '/admin/13000000000/subregions?boundary=true'
    })
    .then(function (resp) {
      var obj = JSON.parse(resp.payload);
      obj.statusCode.should.equal(400);
      obj.message.should.equal('Request region is too large.');
      done();
    })
    .catch(done);
  });

  it('responds with code 400 for province subregion boundaries', function(done) {
    server.injectThen({
      method: 'GET',
      url: '/admin/13590000000/subregions?boundary=true'
    })
    .then(function (resp) {
      var obj = JSON.parse(resp.payload);
      obj.statusCode.should.equal(400);
      obj.message.should.equal('Request region is too large.');
      done();
    })
    .catch(done);
  });

  it('responds with municipality subregion boundaries', function(done) {
    server.injectThen({
      method: 'GET',
      url: '/admin/13591204000/subregions?boundary=true'
    })
    .then(function (resp) {
      var obj = JSON.parse(resp.payload);
      obj.should.have.keys('type', 'properties', 'features');
      obj.properties.id.should.equal(13591204000);
      obj.properties.name.should.equal('Dumaran');
      obj.properties.type.should.equal(3);
      obj.features.should.have.length(16);
      done();
    })
    .catch(done);
  });

  it('responds no subregion boundaries for barangays', function(done) {
    server.injectThen({
      method: 'GET',
      url: '/admin/13591204002/subregions?boundary=true'
    })
    .then(function (resp) {
      var obj = JSON.parse(resp.payload);
      obj.should.have.keys('type', 'properties', 'features');
      obj.features.should.have.length(0);
      done();
    })
    .catch(done);
  });
});

describe('admin endpoint', function() {
  this.slow(5000);

  it('responds with the right schema for a municipality', function(done) {
    server.injectThen({
      method: 'GET',
      url: '/admin/13591204000'
    })
    .then(function (resp) {
      var obj = JSON.parse(resp.payload);
      obj.should.have.keys('id', 'name', 'type', 'NAME_0', 'NAME_1', 'NAME_2', 'ID_1_OR', 'ID_2_OR');
      done();
    })
    .catch(done);
  });

  it('fetches a boundary for a given municipality id', function(done) {
    getAdminBoundary(7150216000)
    .then(function (boundary) {
      boundary.name.should.equal('Batuan');
      boundary.geometry.coordinates[0].should.have.length(311);
      done();
    })
    .catch(done);
  });

  it.skip('queries a polygon, clipping roads to within the poly', function(done) {
    var poly = {
      'type': 'Feature',
      'properties': {},
      'geometry': {
        'type': 'Polygon',
        'coordinates': [
          [
            [124.7445, 9.5411],
            [124.7445, 9.5261],
            [124.7650, 9.5261],
            [124.7650, 9.5411],
            [124.7445, 9.5411]
          ]
        ]
      }
    };

    queryPolygon(poly)
    .then(function (result) {
      result.should.have.property('features');
      result.features.length.should.be.greaterThan(0);
      var isclipped = result.features.some(function(feature) {
        return feature.properties.name &&
          feature.properties.name === 'shouldbeclipped';
      });
      isclipped.should.equal(true);
      done();
    })
    .catch(done);
  });

  it('responds with code 400 for region road network', function(done) {
    server.injectThen({
      method: 'GET',
      url: '/admin/13000000000?roadNetwork=true'
    })
    .then(function (resp) {
      var obj = JSON.parse(resp.payload);
      obj.statusCode.should.equal(400);
      obj.message.should.equal('Request area is greater than maximum request area.');
      done();
    })
    .catch(done);
  });

  it('responds with code 400 for province road network', function(done) {
    server.injectThen({
      method: 'GET',
      url: '/admin/13590000000?roadNetwork=true'
    })
    .then(function (resp) {
      var obj = JSON.parse(resp.payload);
      obj.statusCode.should.equal(400);
      obj.message.should.equal('Request area is greater than maximum request area.');
      done();
    })
    .catch(done);
  });

  it.skip('responds with barangays road network', function(done) {
    server.injectThen({
      method: 'GET',
      url: '/admin/13591204002?roadNetwork=true'
    })
    .then(function (resp) {
      var obj = JSON.parse(resp.payload);
      obj.should.have.keys('type', 'properties', 'features');
      obj.properties.id.should.equal(13591204002);
      obj.properties.name.should.equal('Bohol');
      obj.properties.type.should.equal(4);
      obj.features.should.have.length(1);
      obj.features[0].properties.should.have.keys('highway', 'or_rdclass', 'source');
      done();
    })
    .catch(done);
  });

  it('responds with region boundaries', function(done) {
    server.injectThen({
      method: 'GET',
      url: '/admin/13000000000?boundary=true'
    })
    .then(function (resp) {
      var obj = JSON.parse(resp.payload);
      obj.should.have.keys('type', 'properties', 'geometry');
      obj.properties.id.should.equal(13000000000);
      obj.properties.name.should.equal('Region IV-B (Mimaropa)');
      obj.properties.type.should.equal(1);
      done();
    })
    .catch(done);
  });

  it('responds with province boundaries', function(done) {
    server.injectThen({
      method: 'GET',
      url: '/admin/13590000000?boundary=true'
    })
    .then(function (resp) {
      var obj = JSON.parse(resp.payload);
      obj.properties.id.should.equal(13590000000);
      obj.properties.name.should.equal('Palawan');
      obj.properties.type.should.equal(2);
      obj.should.have.keys('type', 'properties', 'geometry');
      done();
    })
    .catch(done);
  });

  it('responds with municipality boundaries', function(done) {
    server.injectThen({
      method: 'GET',
      url: '/admin/13591204000?boundary=true'
    })
    .then(function (resp) {
      var obj = JSON.parse(resp.payload);
      obj.should.have.keys('type', 'properties', 'geometry');
      obj.properties.id.should.equal(13591204000);
      obj.properties.name.should.equal('Dumaran');
      obj.properties.type.should.equal(3);
      done();
    })
    .catch(done);
  });

  it('responds with barangays boundaries', function(done) {
    server.injectThen({
      method: 'GET',
      url: '/admin/13591204002?boundary=true'
    })
    .then(function (resp) {
      var obj = JSON.parse(resp.payload);
      obj.properties.id.should.equal(13591204002);
      obj.properties.name.should.equal('Bohol');
      obj.properties.type.should.equal(4);
      obj.should.have.keys('type', 'properties', 'geometry');
      done();
    })
    .catch(done);
  });

});

describe('admin search endpoint', function() {
  this.slow(5000);

  function sortIDs(a, b) {
    var idA = parseInt(a.id);
    var idB = parseInt(b.id);
    return (idA < idB) ? -1 : (idA > idB) ? 1 : 0;
  }

  it('responds with the right results for term sayan', function(done) {
    var expected = [{"id":3771538003,"name":"Apsayan","type":4},{"id":1350635003,"name":"Bacsayan","type":4},{"id":1390751003,"name":"Bacsayan","type":4},{"id":17420846003,"name":"Bansayan","type":4},{"id":17420820003,"name":"Bansayan","type":4},{"id":17420844025,"name":"Bansayan","type":4},{"id":4120174012,"name":"Calansayan","type":4},{"id":7691413004,"name":"Cansayang","type":4},{"id":2180316013,"name":"Capissayan Norte","type":4},{"id":2180316014,"name":"Capissayan Sur","type":4}];

    server.injectThen({
      method: 'GET',
      url: '/admin/search/sayan'
    })
    .then(function (resp) {
      JSON.parse(resp.payload).sort(sortIDs).should.be.eql(expected.sort(sortIDs));
      done();
    })
    .catch(done);
  });

  it('responds with the right results for sayan- case insensitive', function(done) {
    var expected = [{"id":3771538003,"name":"Apsayan","type":4},{"id":1350635003,"name":"Bacsayan","type":4},{"id":1390751003,"name":"Bacsayan","type":4},{"id":17420846003,"name":"Bansayan","type":4},{"id":17420820003,"name":"Bansayan","type":4},{"id":17420844025,"name":"Bansayan","type":4},{"id":4120174012,"name":"Calansayan","type":4},{"id":7691413004,"name":"Cansayang","type":4},{"id":2180316013,"name":"Capissayan Norte","type":4},{"id":2180316014,"name":"Capissayan Sur","type":4}];

    server.injectThen({
      method: 'GET',
      url: '/admin/search/SaYaN'
    })
    .then(function (resp) {
      JSON.parse(resp.payload).sort(sortIDs).should.be.eql(expected.sort(sortIDs));
      done();
    })
    .catch(done);
  });

  it('responds with no results for term nothing', function(done) {
    server.injectThen({
      method: 'GET',
      url: '/admin/search/nothing'
    })
    .then(function (resp) {
      JSON.parse(resp.payload).should.be.empty;
      done();
    })
    .catch(done);
  });

  it('responds with a maximum of 10 results', function(done) {
    server.injectThen({
      method: 'GET',
      url: '/admin/search/a'
    })
    .then(function (resp) {
      JSON.parse(resp.payload).should.have.length(10);
      done();
    })
    .catch(done);
  });

});
