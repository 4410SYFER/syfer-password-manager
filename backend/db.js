// Database connection module
// Creates a reusable connection pool to the local MySQL database
// Using a pool (instead of a single connection) allows multiple queries to run efficiently

const mysql = require('mysql2');

// Connect to the password_manager database running in XAMPP on the default MySQL port (3306)
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',           // XAMPP MySQL has no root password by default
  database: 'password_manager',
  waitForConnections: true,
  connectionLimit: 10,    // Maximum number of simultaneous connections
});

// Export the promise-based version so we can use async/await in route files
module.exports = pool.promise();
