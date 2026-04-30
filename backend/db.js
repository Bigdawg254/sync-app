const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not set!');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

pool.on('connect', () => console.log('✅ Database connected'));
pool.on('error', (err) => console.error('❌ Database error:', err.message));

module.exports = pool;