
module.exports.createWay = '<osmChange version="0.3" generator="iD">' +
  '<create>' +
    '<node id="-1" lon="124.15472633706449" lat="10.151493406454932" version="0" changeset="1"/>' +
    '<node id="-4" lon="124.15647513734223" lat="10.153431321701245" version="0" changeset="1"/>' +
    '<node id="-5" lon="124.15747513734223" lat="10.153431321701245" version="0" changeset="1"/>' +
    '<way id="-1" version="0" changeset="1">' +
      '<nd ref="-1"/>' +
      '<nd ref="-4"/>' +      
      '<nd ref="-5"/>' +
    '<tag k="highway" v="tertiary"/>' +
    '<tag k="name" v="Common Road Name"/>' +
    '</way>' +
  '</create>' +
  '<modify/>' +
  '<delete if-unused="true"/>' +
  '</osmChange>';

module.exports.modifyWay = function(node1, node2, node3, way) {

  var xml = '<osmChange version="0.3" generator="iD">' +
  '<create/>' +
  '<modify>' +
    '<node id="'+ node3 +'" lon="124.15747513734223" lat="10.153431321701245" version="0" changeset="1"/>' +
    '<way id="' + way + '" version="0" changeset="1">' +
      '<nd ref="'+ node1 +'"/>' +
      '<nd ref="'+ node3 +'"/>' +
    '<tag k="highway" v="tertiary"/>' +
    '<tag k="name" v="Common Road Name"/>' +
    '</way>' +
  '</modify>' +
  '<delete if-unused="true">' +
      '<node id="'+ node2 + '" lon="124.15647513734223" lat="10.153431321701245" version="0" changeset="1"/>' +
  '</delete>' + 
  '</osmChange>';
  return xml
}

module.exports.createNode = function(id) {
  return '<osmChange version="0.3" generator="iD">' +
  '<create>' +
    '<node id="'+ id +'" lon="123.71275264816284" lat="9.626730050553016" version="1" changeset="1"/>' +
  '</create>' + 
  '<modify/>' +
  '<delete if-unused="true"/>' +
  '</osmChange>';
};


module.exports.modifyNode = function(id) {
  return '<osmChange version="0.3" generator="iD">' +
  '<create/>' +
  '<modify>' +
    '<node id="'+ id +'" lon="123.81275264816284" lat="9.626730050553016" version="1" changeset="1"/>' +
  '</modify>' +
  '<delete if-unused="true"/>' +
  '</osmChange>';
};

module.exports.deleteNode = function(id) {
  return '<osmChange version="0.3" generator="iD">' +
  '<create/>' +
  '<modify/>' +
  '<delete if-unused="true">' +
      '<node id="'+ id + '" lon="123.81275264816284" lat="9.626730050553016" version="0" changeset="1"/>' +
  '</delete>' +
'</osmChange>'
};
