const path = require('path');
require('dotenv/config');

/**
 * Knex migration config for TradeConnect backend.
 * Uses DATABASE_URL and keeps SQL-first migration style for minimal disruption.
 */
module.exports = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: path.resolve(__dirname, 'db', 'knex', 'migrations'),
      tableName: 'knex_migrations',
    },
  },
  staging: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: path.resolve(__dirname, 'db', 'knex', 'migrations'),
      tableName: 'knex_migrations',
    },
  },
  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: path.resolve(__dirname, 'db', 'knex', 'migrations'),
      tableName: 'knex_migrations',
    },
  },
};
