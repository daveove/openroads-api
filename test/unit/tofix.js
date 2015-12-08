'use strict';
var libxml = require('libxmljs');

// to-fix endpoint tests.

describe.skip('to-fix endpoints', function() {
  /*

  it('returns a single node from /xml/node/:id', function (done) {
    var file = require.resolve('./fixtures/node-response.xml');
    var expected = require('fs').readFileSync(file, 'utf-8');

    server.injectThen({
      method: 'GET',
      url: '/xml/node/175267'
    })
    .then(function (res) {
      res.statusCode.should.eql(200);

      // strip timestamps because differing test machine timezones plus
      // our timezone-agnostic db schema makes tests fail.
      var timestampAttr = /timestamp\="[^"]*"/g;
      res.payload = res.payload.replace(timestampAttr, '');
      expected = expected.replace(timestampAttr, '');

      res.payload.should.eql(expected);
    done();
    })
    .catch(done);
  });


  it('returns a full way from /xml/way/:id/full', function (done) {
    var file = require.resolve('./fixtures/way-full-response.xml');
    var expected = require('fs').readFileSync(file, 'utf-8');

    server.injectThen({
      method: 'GET',
      url: '/xml/way/166015'
    })
    .then(function (res) {
      res.statusCode.should.eql(200);

      var payload = libxml.parseXmlString(res.payload);
      expected = libxml.parseXmlString(expected);
      expected.get('//way').childNodes().length
        .should.eql(payload.get('//way').childNodes().length);

      done();
    })
    .catch(done);
  });

  */
});
