'use strict';

var fs = require('fs');

function request (bbox) {
  return {
    method: 'GET',
    url: '/xml/map?bbox='+bbox
  };
}

describe('map endpoint', function () {

  it('fails without valid bbox parameter', function (done) {
    server.injectThen(request('0,0,1'))
    .then(function (res) {
      res.statusCode.should.not.eql(200);
      var result = JSON.parse(res.payload);
      result.message.should
        .equal('Latitude/longitude bounds must be valid coordinates.');
      done();
    })
    .catch(function (err) {
      return done(err);
    });
  });

  it('succeeds with valid bbox parameter', function (done) {
    server.injectThen(request('0,0,0.1,0.1'))
    .then(function (res) {
      res.statusCode.should.equal(200);
      done();
    })
    .catch(function (err) {
      return done(err);
    });
  });

  it('yields an empty response when the given bounding box is empty',
  function (done) {
    var expected = '<?xml version="1.0" encoding="UTF-8"?>\n<osm version="6" generator="DevelopmentSeed">\n  <bounds minlat="-0.1" minlon="-0.1" maxlat="0.1" maxlon="0.1"/>\n</osm>\n';

    server.injectThen(request('-0.1,-0.1,0.1,0.1'))
    .then(function (res) {
      res.statusCode.should.equal(200);
      res.payload.should.equal(expected);

      done();
    })
    .catch(function (err) {
      return done(err);
    });
  });


  it.skip('returns the complete way when part lies outside bbox',
  function (done) {
    var file = './fixtures/bbox-response-oneWay.xml';
    var expected = fs.readFileSync(require.resolve(file), 'utf-8');

    server.injectThen(request('124.7445, 9.5261, 124.765, 9.5411'))
    .then(function (res) {

      // strip timestamps because differing test machine timezones plus
      // our timezone-agnostic db schema makes tests fail.
      var timestampAttr = /timestamp\="[^"]*"/g;
      res.payload = res.payload.replace(timestampAttr, '');
      expected = expected.replace(timestampAttr, '');

      res.statusCode.should.eql(200);
      res.payload.should.equal(expected);

      done();
    })
    .catch(function (err) {
      return done(err);
    });
  });
});

describe('geojson map endpoint', function() {
  it.skip('returns the complete way when part lies outside bbox',
  function (done) {
    var bbox = '123.81042480468751,9.584500864717155,123.81591796875,9.58991730708743';
    var file = './fixtures/bbox-response-oneWay.json';
    var expected = fs.readFileSync(require.resolve(file), 'utf-8');

    server.injectThen({
      method: 'GET',
      url: '/map?bbox=' + bbox
    })
    .then(function (res) {

      res.statusCode.should.eql(200);
      res.payload.should.equal(expected);

      done();
    })
    .catch(function (err) {
      return done(err);
    });
  });
});
