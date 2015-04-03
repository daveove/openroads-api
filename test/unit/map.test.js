'use strict';

describe('map endpoint', function () {
  
  it('fails without valid bbox parameter', function (done) {
    var options = {
      method: 'GET',
      url: '/xml/map',
    };

    server.injectThen(options)
    .then(function handleResponse(res) {
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
    var options = {
      method: 'GET',
      url: '/xml/map?bbox=0,0,0,0',
    };

    server.injectThen(options)
    .then(function handleResponse(res) {
      res.statusCode.should.eql(200);
      res.payload.should.equal(expected);
      done();
    })
    .catch(function (err) {
      return done(err);
    });
  });
});
