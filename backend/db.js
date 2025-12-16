
const mysql = require('mysql2/promise');

// Explicitly log what we are trying to connect to (masking password)
console.log('--- Database Configuration ---');
console.log(`Host: ${process.env.DB_HOST}`);
console.log(`User: ${process.env.DB_USER}`);
console.log(`Database: ${process.env.DB_NAME}`);
console.log(`Port: ${process.env.DB_PORT || 3306}`);
console.log('------------------------------');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Add specific socket path if using MariaDB/MySQL on localhost via socket
  // socketPath: '/var/run/mysqld/mysqld.sock' 
});

// Test connection immediately
pool.getConnection()
    .then(conn => {
        console.log("✅ Database connection established successfully.");
        conn.release();
    })
    .catch(err => {
        console.error("❌ Database connection FAILED:", err.message);
        console.error("Check your .env file and ensure MySQL is running.");
    });

module.exports = pool;
