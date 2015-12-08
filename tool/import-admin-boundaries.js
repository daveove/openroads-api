#!/usr/bin/env node

/**
 * WARNING: JSONStream assumes that the input is utf-8, but in some
 * cases ogr2ogr produces GeoJSON files in ISO-8859-1 (extended
 * ascii), which can cause parsing errors.
 *
 * Double check on linux/mac with:
 * file --mime-encoding yourfile.json
 *
 * And if necessary, convert to UTF-8 with:
 * iconv -f ISO-8859-1 -t UTF-8 yourfile.json > output.json
 */

'use strict';

// jshint maxlen: false
var JSONStream = require('JSONStream');
var through = require('through2');
var knex = require('../connection.js');

var count = 0;

knex.transaction(function (trx) {
  process.stdin
  .pipe(JSONStream.parse('features.*'))
  .pipe(through.obj(function write(feat, enc, next) {

    var props = feat.properties;
    var id = props.ID_4_OR || props.ID_3_OR || props.ID_2_OR || props.ID_1_OR;

    console.log('inserting: ' + id);
    if(process.argv[2]) return next();
    trx('admin_boundaries')
      .insert({
        id: id,
        geo: feat
      })
      .then(function() { count++; next(); })
      .catch(next);

  }, function end() {
    trx.commit();
    this.push(null);
  }))
  .on('error', function (err) {
    console.error(err);
    trx.rollback(err);
  });
})
.then(function (inserts) {
  console.log(inserts);
  console.log('Inserted ' + count + ' features.');
})
.catch(function (err) {
  console.error(err);
});
