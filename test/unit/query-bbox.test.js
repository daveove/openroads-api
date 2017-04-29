var should = require('should');
var knex = require('../../connection');
var BoundingBox = require('../../services/bounding-box');
var queryBbox = require('../../services/query-bbox');

describe('bounding box query service', function () {
  it('returns a default object structure on empty query', function (done) {
    var bbox = new BoundingBox.fromCoordinates([0.1, 0.1, 0.12, 0.12]);
    queryBbox(knex, bbox).then(function (results) {
      results.should.have.property('relationtags', []);
      done();
    });
  });
});
