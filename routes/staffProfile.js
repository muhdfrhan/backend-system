// routes/staffProfile.js
import express from 'express';
import connection from '../connection-db.js';
import { protectStaff } from '../middleware/authMiddleware.js'; // Reuse staff protection middleware

const router = express.Router();

// GET /api/staff/profile - Fetches the profile of the currently logged-in staff member
router.get('/profile', protectStaff, async (req, res) => {
  // req.user.id should be the staff_id from the JWT token
  // This ID comes from whatever you put as 'id' in the jwt.sign() payload in your auth.js
  // e.g., { id: userRecord.staff_id, ... }
  const staffIdFromToken = req.user.id;

  if (!staffIdFromToken) {
    // This should ideally not happen if protectStaff middleware is working correctly
    // and the JWT has an 'id' field.
    return res.status(400).json({ error: 'Staff ID not found in token' });
  }

  // Adjust column names in the SELECT statement to match your STAFF table exactly.
  // Especially the ID column (staff_id, user_id, id, etc.) used in the WHERE clause.
  const sqlQuery = `
    SELECT
      user_id,  -- Or whatever your ID column is named, aliasing to user_id for consistency if desired
      name,
      username,
      position,
      email
    FROM STAFF
    WHERE user_id = ?; -- Ensure this column name matches the ID used in the JWT's 'id' field
  `;

  try {
    const [rows] = await connection.promise().query(sqlQuery, [staffIdFromToken]);

    if (rows.length === 0) {
      // This would be unusual if the token is valid and the ID came from the database,
      // but it's a good safeguard. It implies the user associated with a valid token
      // no longer exists or their ID has changed.
      return res.status(404).json({ error: 'Staff profile not found for the provided token ID.' });
    }

    res.json(rows[0]); // Send the first (and should be only) row
  } catch (err) {
    console.error('Database error fetching staff profile:', err);
    res.status(500).json({ error: 'Failed to fetch staff profile' });
  }
});

export default router;