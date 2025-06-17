// routes/applicantDashboard.js
import express from 'express';
import connection from '../connection-db.js';

const router = express.Router();

// ✅ Route contains :id
router.get('/applicantdashboard/:id', async (req, res) => {
  const applicantId = req.params.id;

  try {
    const [rows] = await connection.promise().query(
      `SELECT * FROM APPLICANTS WHERE applicant_id = ?`,
      [applicantId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Applicant not found or no application submitted" });
    }

    res.json(rows[0]);

  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Failed to fetch applicant dashboard data" });
  }
});

export default router;
