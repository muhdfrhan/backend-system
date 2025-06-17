// routes/financeAuth.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connection from '../connection-db.js';

const router = express.Router();

// --- Finance Staff Login Endpoint ---
router.post('/finance/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const db = connection.promise();
    const [rows] = await db.query(
      "SELECT user_id, name, username, password, position FROM STAFF WHERE username = ? AND position = 'Finance'",
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials or access denied.' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials or access denied.' });
    }

    const payload = {
      id: user.user_id,
      username: user.username,
      role: 'finance'
    };
    
    // FIX: Use the exact same secret key as in your middleware file.
    const token = jwt.sign(
      payload,
      'your_jwt_secret_key', // <-- THIS NOW MATCHES
      { expiresIn: '8h' }
    );

    res.json({
      message: 'Finance login successful',
      token,
      user: { name: user.name, username: user.username , position: user.position , email: user.email }
    });

  } catch (err) {
    console.error('Finance login server error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

export default router;