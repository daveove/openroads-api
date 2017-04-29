'use strict';
var meta = require('../../services/meta');
var agatuya = require('./fixtures/agatuya.json');

describe('road and region meta', function () {
  var sampleRoad = {
    properties: {
      or_class: 'foo',
      or_condition: 'bar',
      baz: 'baz'
    },
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: []}
  }

  it('calculates distance of roads in kilometers', function (done) {
    var info = meta.road(agatuya[0].features[0]);
    info.roadLength.should.equal(0.1858748375998852);
    done();
  });

  it('checks for road tags, marks empty coordinates as 0', function (done) {
    // Uses the required tags, specified on models/way.js
    // requiredTags: ['or_class', 'or_rdclass', 'or_condition']
    var info = meta.road(sampleRoad);
    info.tagScore.should.equal(2/3);
    info.roadLength.should.equal(0);
    done();
  });

  it('collects aggregate metadata for a region', function (done) {
    var info = meta.region(agatuya[0]);
    info.tagScore.should.be.number;
    info.roadLength.should.be.number;
    done()
  });
});
