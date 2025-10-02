const mysql = require('mysql2/promise');

// Create a connection pool to the database
// Using a pool is more efficient than creating a new connection for every query
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// The initial connection check is now handled in server.js to ensure
// the server only starts if the database is available.

module.exports = pool;