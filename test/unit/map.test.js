'use strict';

var fs = require('fs');

function request (bbox) {
  return {
    method: 'GET',
    url: '/xml/map' + bbox ? '?bbox='+bbox : ''
  };
}


describe('map endpoint', function () {
  
  it('fails without valid bbox parameter', function (done) {

    server.injectThen(request())
    .then(function (res) {

      res.statusCode.should.not.eql(200);

      done();
    })
    .catch(function (err) {
      return done(err);
    });
  });

  it('yields an empty response when the given bounding box is empty',
  function (done) {
    var expected = '<osm version="0.6" generator="DevelopmentSeed"></osm>';

    server.injectThen(request('-0.1,-0.1,0.1,0.1'))
    .then(function (res) {

      res.statusCode.should.eql(200);
      res.payload.should.equal(expected);

      done();
    })
    .catch(function (err) {
      return done(err);
    });
  });
  
  it('finds a way contained entirely within the bounding box',
  function (done) {
    var file = './fixtures/bbox-response-oneWay.xml';
    var expected = fs.readFileSync(require.resolve(file));

    server.injectThen(request('123.8148220,9.5820415,123.8162932,9.5920338'))
    .then(function (res) {

      res.statusCode.should.eql(200);
      res.payload.should.equal(expected);

      done();
    })
    .catch(function (err) {
      return done(err);
    });
  });
  
  it('returns the complete way when part lies outside bbox',
  function (done) {
    var file = './fixtures/bbox-response-oneWay.xml';
    var expected = fs.readFileSync(require.resolve(file));

    server.injectThen(request('123.815,9.59,123.8162932,9.5920338'))
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
