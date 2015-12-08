var coordsFromString = function (coordString) {
  var c = coordString.split(',').map(parseFloat);
  if (c.length !== 2) {
    return null;
  }
  if (!isNaN(c[0]) && !isNaN(c[1]) && c[0] >= -180 && c[0] <= 180 && c[1] >= -90 && c[1] <= 90) {
    return c;
  }
  return null;
};

module.exports = {
  fromString: coordsFromString
};
