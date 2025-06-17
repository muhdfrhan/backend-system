import mysql from 'mysql2';

const connection = mysql.createConnection({
  host: '192.168.0.192',  // Use your VM IP
  user: 'farhan',
  password: 'Abc12345!',
  database: 'fyp_zakat_db',
  port: 3306
});

connection.connect(err => {
  if (err) {
    console.error('DB connection failed:', err.stack);
    return;
  }
  console.log('Connected to MySQL database');
});

export default connection;
