// routes/finance.js
/*import express from 'express';
import connection from '../connection-db.js';
// Assume you have a middleware to protect finance routes
import { protectFinance } from '../middleware/authMiddleware.js'; 

const router = express.Router();

// ✅ NEW ENDPOINT: GET /api/finance/dashboard-summary
// Fetches all the necessary data for the main finance dashboard cards and table.
router.get('/dashboard-summary', protectFinance, async (req, res) => {
  try {
    // --- Define SQL Queries ---

    // Query 1: Get aggregate statistics in a single, efficient query using subqueries.
    const statsQuery = `
      SELECT
        (SELECT SUM(amount) FROM ZAKAT_AID) AS totalDisbursed,
        (SELECT COUNT(*) FROM APPLICATIONS WHERE application_status = 'Approved') AS applicationsToDisburse,
        (SELECT COUNT(DISTINCT application_id) FROM ZAKAT_AID) AS totalRecipients,
        (SELECT COUNT(*) FROM ZAKAT_AID WHERE DATE(disbursed_date) = CURDATE()) AS disbursedToday
    `;

    // Query 2: Get the 10 most recent disbursement records.
    // We must JOIN across three tables to get all the required information.
    const recentDisbursementsQuery = `
      SELECT
        za.aid_id AS id,
        ap.full_name AS recipientName,
        za.amount,
        app.application_status AS status,
        za.disbursed_date AS date
      FROM ZAKAT_AID za
      JOIN APPLICATIONS app ON za.application_id = app.application_id
      JOIN APPLICANTS ap ON app.applicant_id = ap.applicant_id
      WHERE app.application_status = 'Disbursed'
      ORDER BY za.disbursed_date DESC
      LIMIT 10;
    `;

    // --- Execute Queries in Parallel ---
    // Promise.all runs both queries simultaneously for better performance.
    const [statsResult, disbursementsResult] = await Promise.all([
      connection.promise().query(statsQuery),
      connection.promise().query(recentDisbursementsQuery)
    ]);

    // --- Format the Response ---
    // The stats query returns an array with a single object. We extract that object.
    const stats = statsResult[0][0] || {};
    // The disbursements query returns an array of rows.
    const disbursements = disbursementsResult[0];

    // --- Send the final JSON object to the frontend ---
    res.json({
      stats,
      disbursements
    });

  } catch (err) {
    // If any error occurs during the process, log it and send a server error response.
    console.error('Error fetching finance dashboard summary:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// 1. GET /api/finance/approved-list
// Fetches all applications that are approved but not yet disbursed.
router.get('/approved-list', protectFinance, async (req, res) => {
  const query = `
    SELECT
      APP.application_id,
      APP.decision_date,
      APP.officer_remarks,
      A.full_name AS applicant_name,
      A.nric AS applicant_nric,
      S.name AS approved_by_staff
    FROM APPLICATIONS APP
    JOIN APPLICANTS A ON APP.applicant_id = A.applicant_id
    LEFT JOIN STAFF S ON APP.handled_by = S.user_id
    WHERE APP.application_status = 'Approved'
    ORDER BY APP.decision_date ASC;
  `;
  try {
    const [applications] = await connection.promise().query(query);
    res.json(applications);
  } catch (err) {
    console.error('Error fetching approved applications:', err);
    res.status(500).json({ error: 'Failed to fetch approved applications list' });
  }
});


// 2. POST /api/finance/disburse
// Records the disbursement details and updates the application status.
router.post('/disburse', protectFinance, async (req, res) => {
  const { applicationId, aid_type, amount, notes } = req.body;
  const financeOfficerId = req.user.id;

  if (!applicationId || !aid_type || !amount) {
    return res.status(400).json({ error: 'Application ID, aid type, and amount are required.' });
  }

  // Get the single connection instance
  const db = await getDbConnection();

  try {
    // ✅ Start the transaction directly on the single connection object
    await db.beginTransaction();

    // Action A: Insert a new record
    const aidQuery = `
      INSERT INTO ZAKAT_AID (application_id, aid_type, amount, disbursed_by, disbursed_date, notes)
      VALUES (?, ?, ?, ?, NOW(), ?);
    `;
    await db.query(aidQuery, [applicationId, aid_type, amount, financeOfficerId, notes]);

    // Action B: Update the application's status
    const appUpdateQuery = `
      UPDATE APPLICATIONS
      SET application_status = 'Disbursed'
      WHERE application_id = ? AND application_status = 'Approved';
    `;
    const [result] = await db.query(appUpdateQuery, [applicationId]);
    
    if (result.affectedRows === 0) {
      throw new Error('Application was not in an "Approved" state or does not exist.');
    }

    // ✅ Commit the changes on the single connection
    await db.commit();
    res.json({ message: 'Aid disbursement recorded successfully.' });

  } catch (err) {
    // ✅ Roll back the changes on the single connection
    await db.rollback();
    console.error('Error recording disbursement:', err);
    res.status(500).json({ error: 'Failed to record disbursement. ' + err.message });
  } 
  // ❌ There is no `finally` block to `release` the connection, because there is no pool.
});

export default router;*/