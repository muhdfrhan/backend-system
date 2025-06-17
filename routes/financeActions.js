// routes/financeActions.js
import express from 'express';
import connection from '../connection-db.js';
import { protectFinance } from '../middleware/authMiddleware.js'; // We will create this middleware next.

const router = express.Router();

// --- Finance Dashboard Statistics ---
// GET /api/finance/dashboard-stats
router.get('/finance/dashboard-stats', protectFinance, async (req, res) => {
  try {
    const db = connection.promise();
    // Count applications with status 'Approved' (waiting for disbursement)
    const [waitingRows] = await db.query("SELECT COUNT(*) AS count FROM APPLICATIONS WHERE application_status = 'Approved'");
    // Count applications with status 'Disbursed'
    const [disbursedRows] = await db.query("SELECT COUNT(*) AS count FROM APPLICATIONS WHERE application_status = 'Disbursed'");
    
    res.json({
      waitingDisbursement: waitingRows[0].count,
      alreadyDisbursed: disbursedRows[0].count,
    });
  } catch (err) {
    console.error('Error fetching finance dashboard stats:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// --- Get List of Applications to Disburse ---
// GET /api/finance/approved-applications
router.get('/finance/approved-applications', protectFinance, async (req, res) => {
  try {
    const db = connection.promise();
    // This query joins the necessary tables to get all info the finance staff needs.
    const query = `
      SELECT 
        a.application_id,
        app.full_name,
        app.nric,
        app.bank_name,
        app.account_number,
        c.name AS category_name,
        a.approved_amount
      FROM APPLICATIONS a
      JOIN APPLICANTS app ON a.applicant_id = app.applicant_id
      JOIN ASNAF_CATEGORIES c ON a.category_id = c.category_id
      WHERE a.application_status = 'Approved'
      ORDER BY a.last_updated ASC;
    `;
    const [rows] = await db.query(query);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching approved applications:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// --- Disburse Aid Action ---
// POST /api/finance/disburse/:applicationId
router.post('/finance/disburse/:applicationId', protectFinance, async (req, res) => {
  const { applicationId } = req.params;
  const { aid_type, notes } = req.body; // e.g., aid_type = 'Bank Transfer', notes = 'Ref #12345'
  const financeStaffId = req.user.id; // Get the logged-in finance staff's ID from the JWT token.

  if (!aid_type) {
    return res.status(400).json({ error: 'Disbursement method (aid_type) is required.' });
  }

  const db = await connection.promise();
  
  try {
    // A transaction ensures that all database operations succeed or fail together.
    await db.beginTransaction();

    // 1. Check the application status and get the approved amount.
    const [appRows] = await db.query(
      "SELECT approved_amount FROM APPLICATIONS WHERE application_id = ? AND application_status = 'Approved' FOR UPDATE",
      [applicationId]
    );

    if (appRows.length === 0) {
      await db.rollback();
      return res.status(404).json({ error: 'Application not found or it is not in an "Approved" state.' });
    }
    const approvedAmount = appRows[0].approved_amount;

    // 2. Log the transaction in your ZAKAT_AID table.
    await db.query(
      "INSERT INTO ZAKAT_AID (application_id, aid_type, amount, disbursed_by, disbursed_date, notes) VALUES (?, ?, ?, ?, NOW(), ?)",
      [applicationId, aid_type, approvedAmount, financeStaffId, notes]
    );

    // 3. Update the main application's status to 'Disbursed'.
    const statusDetail = `Aid of RM${approvedAmount} disbursed via ${aid_type}.`;
    await db.query(
      "UPDATE APPLICATIONS SET application_status = 'Disbursed', status_detail = ? WHERE application_id = ?",
      [statusDetail, applicationId]
    );
    
    // If all steps were successful, commit the changes to the database.
    await db.commit();

    res.json({ message: 'Aid disbursed successfully and recorded.' });

  } catch (err) {
    // If any step failed, roll back all changes from this transaction.
    await db.rollback();
    console.error('Error during aid disbursement transaction:', err);
    res.status(500).json({ error: 'Server error during disbursement.' });
  }
});

export default router;