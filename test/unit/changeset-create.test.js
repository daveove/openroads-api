'use strict';

describe('changeset create endpoint', function () {

  it('returns a numerical changeset id.', function (done) {
    server.injectThen({
      method: 'PUT',
      url: '/changeset/create',
      payload: {
        uid: 99,
        user: 'openroads',
        comment: 'test comment'
      }
    })
    .then(function (res) {
      res.statusCode.should.eql(200);
      var result = JSON.parse(res.payload);
      result.id.should.be.within(0, Number.MAX_VALUE);
      done();
    })
    .catch(function (err) {
      return done(err);
    });
  });

  it('creates a user with the given id if one does not exist',
  function(done) {
    server.injectThen({
      method: 'PUT',
      url: '/changeset/create',
      payload: {
        uid: 1337,
        user: 'openroads test user',
        comment: 'test comment'
      }
    })
    .then(function (res) {
      res.statusCode.should.eql(200);
      var result = JSON.parse(res.payload);
      result.id.should.be.within(0, Number.MAX_VALUE);
      done();
    })
    .catch(function (err) {
      return done(err);
    });

  });

});
