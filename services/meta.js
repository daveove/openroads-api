'use strict';
var lineDistance = require('turf-line-distance');
var requiredTags = require('../models/way').requiredTags;
var performance = require('./performance');

function getTagScore (road) {
  return requiredTags.reduce(function (prev, curr) {
    if (road.properties[curr]) {
      return prev + 1;
    } else {
      return prev + 0;
    }
  }, 0) / requiredTags.length;
}

function getRoadLength (road) {
  return lineDistance(road, 'kilometers');
}

function roadMeta (road) {
  return {
    tagScore: getTagScore(road),
    roadLength: getRoadLength(road)
  };
}

function regionMeta (region) {
  region.features = region.features ?
    (Array.isArray(region.features) ? region.features : [region.features])
  : [];

  var last = new Date();
  var avgTagScore = region.features.map(getTagScore)
  .reduce(sum, 0) / region.features.length;
  last = performance.log(last, 'meta#getTagScore');

  var totalRoadLength = region.features.map(getRoadLength)
  .reduce(sum, 0);
  last = performance.log(last, 'meta#getRoadLength');

  return {
    tagScore: avgTagScore,
    roadLength: totalRoadLength
  }
}

module.exports = {
  road: roadMeta,
  region: regionMeta
};

function sum (a, b) {
  return a + b;
}
