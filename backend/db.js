
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

// Test the connection
pool.getConnection()
  .then(connection => {
    console.log('Successfully connected to the database.');
    connection.release();
  })
  .catch(err => {
    console.error('Error connecting to the database:');
    console.error(`Please check your .env file and ensure the database server is running and accessible.`);
    console.error(`Details: ${err.message}`);
  });


module.exports = pool;
