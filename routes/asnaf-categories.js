// routes/asnaf-categories.js
import express from 'express';
import connection from '../connection-db.js';

const router = express.Router();

router.get('/asnaf-categories', (req, res) => {
  const query = 'SELECT category_id, name, description FROM ASNAF_CATEGORIES';
  connection.query(query, (err, results) => {
    if (err) {
      console.error("Failed to fetch categories", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

export default router;
