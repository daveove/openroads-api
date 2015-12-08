'use strict';
var fs = require('fs');
var serverShouldStatus= function(mock, done, status) {
  var options = {
    method: 'POST',
    url: '/upload/1',
    payload: mock
  };
  server.injectThen(options)
  .then(function(res) {
    res.statusCode.should.eql(status);
    return done();
  }).catch(function(err) {
    return done(err);
  });
};

describe('OScUploadController', function() {
  describe('#upload', function() {
    var data = fs.readFileSync(
      require.resolve('./fixtures/osc-malvar-road.xml'));
    it('Should ok when uploading a valid file', function(done) {
      serverShouldStatus(data, done, 200);
    });

    it('Should break when uploading a malformed file', function(done) {
      data[0] = 0;
      serverShouldStatus(data, done, 400);
    });
  });
});