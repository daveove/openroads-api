// TODO: change default to 'production' once we're ready to switch over to that
// db
var environment = process.env.OR_ENV || 'old-production';

var connection = process.env.DATABASE_URL || require('./local').connection[environment];
var knex = require('knex')({
  client: 'pg',
  connection: connection,
  debug: false,
  pool: {

    // These are the default settings for PG sql that knex sets.
    // Change these if we get connection pool errors.
    min: 2,
    max: 10
  }
});

module.exports = knex;
