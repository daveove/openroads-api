var toGeoJSON = require('../../services/osm-data-to-geojson');

describe('OSM to GeoJSON service', function () {
  it('does not fail on empty object', function () {
    var result = toGeoJSON({});
    result.should.have.property('type', 'FeatureCollection')
    result.should.have.property('features', []);
  });
});
