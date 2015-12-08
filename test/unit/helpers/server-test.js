// Takes a mock changeset and the done function.
// Also takes a callback, which executes after the response.
// If there's a callback, it should call done().
module.exports = function(mock, done, cb) {
  var options = {
    method: 'POST',
    url: '/changeset/1/upload',
    payload: {
      osmChange: mock
    }
  };
  server.injectThen(options)
  .then(function(res) {
    if (cb) {
      return cb(res);
    }
    else {
      res.statusCode.should.eql(200);
      return done();
    }
  }).catch(function(err) {
    console.log(err);
    return done();
  });
};
