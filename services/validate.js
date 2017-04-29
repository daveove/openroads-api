'use strict';
var Promise = require('bluebird');
var knex = require('../connection');
var meta = require('./meta');
var getAdminBoundary = require('./admin-boundary');
var queryPolygon = require('./query-polygon');
var log = require('./log');

var adminTable = 'admin_boundaries';

// Returns a Knex promise that retrieves every
// unique admin ID.
// NOTE: this relies on having admin data pre-loaded in DB.
function getAllAdminIds () {
  return knex(adminTable)
    .distinct('id')
    .select();
}

function getRegions (ids) {
  return ids.filter(function (obj) {
    return obj.id % 1000000000 === 0;
  });
}

function getProvinces (ids) {
  return ids.filter(function (obj) {
    return obj.id % 10000000 === 0 && obj.id % 1000000000 !== 0;
  });
}

function getMunicipalities (ids) {
  return ids.filter(function (obj) {
    return !obj.id % 1000 === 0 && obj.id % 10000000 !== 0;
  });
}

function getBoundaries (filter) {
  return getAllAdminIds().then(filter).then(function (ids) {
    console.log('have ids', JSON.stringify(ids));
    ids = ids.map(function(obj) {
      return obj.id;
    })
    return knex.select('geo').from(adminTable).whereIn('id', ids);
  });
}

function validate () {
  return Promise.all(getBoundaries(getRegions).map(function (boundary) {
    return queryPolygon(boundary.geo);
  })).then(function (regionData) {
    return regionData.map(meta.region);
  });
}

module.exports = validate;
