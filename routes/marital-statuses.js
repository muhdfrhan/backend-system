import express from 'express';
import connection from '../connection-db.js';

const router = express.Router();

// ✅ NEW or EXISTING: Route to get all marital statuses
router.get('/marital-statuses', async (req, res) => {
  try {
    const query = 'SELECT status_id, status_name FROM MARITAL_STATUSES ORDER BY status_id';
    const [statuses] = await connection.promise().query(query);
    res.json(statuses);
  } catch (err) {
    console.error('Failed to fetch marital statuses:', err);
    res.status(500).json({ error: 'Failed to fetch marital statuses' });
  }
});

// ... other routes can go here

export default router;