require('should');
server = require('../');

server.register(require('inject-then'), function (err) {
  'use strict';
  if (err) throw err;
});


// after(function (done) {
//   'use strict';
//   var knex = require('../connection.js');
//   knex.transaction(function(transaction) {
//     var nodeIds = knex.select('id').from('current_nodes')
//                       .where('changeset_id', 1);
//     var wayIds = knex.select('id').from('current_ways')
//                      .where('changeset_id', 1);

//     var relationIds = knex.select('id').from('current_relations')
//                       .where('changeset_id', 1);
//     return transaction('current_way_nodes').whereIn('node_id', nodeIds).orWhereIn('way_id', wayIds).del().returning('*')
//     .then(function(deleted) {
//       console.log(deleted.length, 'way nodes deleted');
//       return transaction('current_way_tags').whereIn('way_id', wayIds).del().returning('*'); })
//     .then(function(deleted) {
//       console.log(deleted.length, 'way tags deleted');
//       return transaction('current_node_tags').whereIn('node_id', nodeIds).del().returning('*'); })
//     .then(function(deleted) {
//       console.log(deleted.length, 'node tags deleted');
//       return transaction('current_relation_tags').whereIn('relation_id', relationIds).del().returning('*'); })
//     .then(function(deleted) {
//       console.log(deleted.length, 'relation tags deleted');
//       return transaction('current_relation_members').whereIn('relation_id', relationIds).del().returning('*'); })
//     .then(function(deleted) {
//       console.log(deleted.length, 'relation members deleted');
//       return transaction('current_ways').where('changeset_id', 1).del().returning('*'); } )
//     .then(function(deleted) {
//       console.log(deleted.length, 'nodes deleted');
//       return transaction('current_nodes').where('changeset_id', 1).del().returning('*'); } )
//     .then(function(deleted) {
//       console.log(deleted.length, 'ways deleted');
//       return transaction('current_relations').where('changeset_id', 1).del().returning('*'); });
//   })
//   .then(function () {
//     knex('users').where({id: 1337}).delete();
//   })
//   .then(function() {
//     console.log('Cleaned up tests');
//     return done();
//   })
//   .catch(function(err) {
//     return done(err);
//   });
// });