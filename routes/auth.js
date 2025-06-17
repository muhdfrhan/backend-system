// routes/auth.js
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt'; // <--- 1. IMPORT BCRYPT
import connection from '../connection-db.js';

const router = express.Router();
const JWT_SECRET = 'your_jwt_secret_key'; // Dev only
const SALT_ROUNDS = 10; // Standard practice for bcrypt

// POST /loginstaff (Username + Password)
router.post('/login', (req, res) => 
{
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const sql = 'SELECT user_id, username, password, name, position, email FROM STAFF WHERE username = ?';
  connection.query(sql, [username], (err, results) => {
    if (err) {
      console.error('MySQL Error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      // Use a generic error message for security (prevents username enumeration)
      return res.status(401).json({ error: 'Invalid username' });
    }

    const userRecord = results[0];

    // --- 2. PASSWORD COMPARISON LOGIC CHANGED ---
    // Compare the plain-text password from the request with the hashed password from the database
    bcrypt.compare(password, userRecord.password, (bcryptErr, isMatch) => {
      if (bcryptErr) {
        console.error('Bcrypt compare error:', bcryptErr);
        return res.status(500).json({ error: 'Authentication error' });
      }

      if (!isMatch) {
        // Passwords do not match
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // --- 3. IF MATCH, PROCEED AS BEFORE ---
      // Passwords match, user is authenticated
      const token = jwt.sign(
        { id: userRecord.user_id, username: userRecord.username },
        JWT_SECRET,
        { expiresIn: '5h' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: userRecord.user_id,
          username: userRecord.username,
          name: userRecord.name || null,
          position: userRecord.position || null,
          email: userRecord.email || null,
        },
      });
    });
  });
});


router.post('/ApplcnLogin', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const sql = 'SELECT AA.applicant_id, AA.username, AA.password, A.full_name FROM APPLICANT_ACCOUNTS AA JOIN APPLICANTS A ON AA.applicant_id = A.applicant_id WHERE AA.username = ?';
  
  connection.query(sql, [username], (err, results) => {
    if (err) {
      console.error('MySQL Error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userRecord = results[0];

    // --- NEW: USE BCRYPT TO COMPARE PASSWORDS ---
    bcrypt.compare(password, userRecord.password, (bcryptErr, isMatch) => {
      if (bcryptErr) {
        console.error('Bcrypt compare error for applicant:', bcryptErr);
        return res.status(500).json({ error: 'Authentication error' });
      }

      if (!isMatch) {
        // Passwords do not match
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // --- Passwords match, proceed with JWT generation ---
      const token = jwt.sign(
        { id: userRecord.applicant_id, username: userRecord.username },
        JWT_SECRET,
        { expiresIn: '5h' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: userRecord.applicant_id,
          username: userRecord.username,
          name: userRecord.full_name || null,
        },
      });
    });
  });
});
export default router;