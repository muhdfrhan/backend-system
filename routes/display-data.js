// routes/display-data.js
import express from 'express';
import connection from '../connection-db.js'; // MySQL connection

const router = express.Router();

// GET /dashboard
router.get('/dashboard', async (req, res) => {
  try {
    // Use promise-based queries
    const [zakatDisbursedRows] = await connection.promise().query(
      "SELECT SUM(amount) AS zakatDisbursed FROM ZAKAT_AID"
    );

    const [rejectedAppsRows] = await connection.promise().query(
      "SELECT COUNT(*) AS rejectedApplications FROM APPLICATIONS WHERE APPLICATION_STATUS = 'rejected'"
    );

    const [approvedAppsRows] = await connection.promise().query(
      "SELECT COUNT(*) AS approvedApplications FROM APPLICATIONS WHERE APPLICATION_STATUS = 'approved'"
    );

    const [totalApplicantsRows] = await connection.promise().query(
      "SELECT COUNT(DISTINCT applicant_id) AS totalApplicants FROM APPLICATIONS"
    );

    /*const [topCategoryRows] = await connection.promise().query(
      "SELECT category, COUNT(*) AS count FROM APPLICANTS GROUP BY category ORDER BY count DESC LIMIT 1"
    );*/

    // Respond with data
    res.json({
      zakatDisbursed: zakatDisbursedRows[0].zakatDisbursed || 0,
      rejectedApplications: rejectedAppsRows[0].rejectedApplications || 0,
      approvedApplications: approvedAppsRows[0].approvedApplications || 0,
      totalApplicants: totalApplicantsRows[0].totalApplicants || 0,
      //topCategory: topCategoryRows[0]?.category || 'Unknown',
    });

  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default router;
