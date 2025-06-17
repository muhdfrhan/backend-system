// BACKEND-SYSTEM/routes/reportRoutes.js

import express from 'express';
import connection from '../connection-db.js';
// Correctly import the specific middleware you need
import { protectAdmin } from '../middleware/authMiddleware.js'; 

const router = express.Router();

// To protect a route, simply add 'protectAdmin' as a second argument before the route handler.
// The middleware will run first. If the token is valid and the role is 'admin', it will call next() to run your handler.
// If not, it will automatically send a 401 or 403 error response.

// ROUTE 1: GET Application Status Funnel (Now protected)
router.get('/status-funnel', protectAdmin, (req, res) => { // <-- ADDED protectAdmin
  const sql = `
    SELECT
        application_status,
        COUNT(application_id) AS total_applications
    FROM APPLICATIONS
    GROUP BY application_status
    ORDER BY FIELD(application_status, 'Pending', 'In Review', 'Documents Requested', 'Pending Interview', 'Approved', 'Disbursed', 'Rejected');
  `;

  connection.query(sql, (error, results) => {
    if (error) {
      console.error("Error fetching status funnel:", error);
      return res.status(500).json({ message: "Database query failed" });
    }
    res.status(200).json(results);
  });
});

// ROUTE 2: GET Applications by Asnaf Category (Now protected)
router.get('/category-breakdown', protectAdmin, (req, res) => { // <-- ADDED protectAdmin
  const sql = `
    SELECT
        AC.name AS category_name,
        COUNT(A.application_id) AS number_of_applications
    FROM APPLICATIONS A
    JOIN ASNAF_CATEGORIES AC ON A.category_id = AC.category_id
    GROUP BY AC.name
    ORDER BY number_of_applications DESC;
  `;

  connection.query(sql, (error, results) => {
    if (error) {
      console.error("Error fetching category breakdown:", error);
      return res.status(500).json({ message: "Database query failed" });
    }
    res.status(200).json(results);
  });
});


// ROUTE 3: KPI Summary (Financials & Processing Time)
router.get('/kpi-summary', protectAdmin, async (req, res) => {
  try {
    const approvedSql = `
      SELECT SUM(approved_amount) AS total_approved 
      FROM APPLICATIONS 
      WHERE application_status = 'Approved' OR application_status = 'Disbursed';
    `;
    const disbursedSql = `SELECT SUM(amount) AS total_disbursed FROM ZAKAT_AID;`;
    const processingSql = `
      SELECT ROUND(AVG(DATEDIFF(a.decision_date, zad.submission_date))) AS avg_processing_days
      FROM APPLICATIONS a
      JOIN ZAKAT_APPLICATION_DETAILS zad ON a.application_id = zad.application_id
      WHERE a.application_status IN ('Approved', 'Rejected') AND a.decision_date IS NOT NULL;
    `;

    // Execute queries in parallel
    const [approvedRows] = await connection.promise().query(approvedSql);
    const [disbursedRows] = await connection.promise().query(disbursedSql);
    const [processingRows] = await connection.promise().query(processingSql);

    const totalApproved = approvedRows[0].total_approved || 0;
    const totalDisbursed = disbursedRows[0].total_disbursed || 0;
    
    res.json({
      totalApproved: totalApproved,
      totalDisbursed: totalDisbursed,
      awaitingDisbursement: totalApproved - totalDisbursed,
      avgProcessingDays: processingRows[0].avg_processing_days || 0
    });

  } catch (error) {
    console.error("Error fetching KPI summary:", error);
    res.status(500).json({ message: "Database query failed for KPI summary" });
  }
});

// ROUTE 4: Applications Trend Over Time (Line Chart)
router.get('/applications-over-time', protectAdmin, (req, res) => {
  const sql = `
    SELECT 
        DATE_FORMAT(zad.submission_date, '%Y-%m') AS submission_month,
        COUNT(a.application_id) AS application_count
    FROM APPLICATIONS a
    JOIN ZAKAT_APPLICATION_DETAILS zad ON a.application_id = zad.application_id
    GROUP BY submission_month
    ORDER BY submission_month ASC
    LIMIT 12;
  `;
  connection.query(sql, (error, results) => {
    if (error) {
      console.error("Error fetching applications over time:", error);
      return res.status(500).json({ message: "Database query failed" });
    }
    res.status(200).json(results);
  });
});

// ROUTE 5: Recent Pending Applications (Table)
router.get('/recent-pending', protectAdmin, (req, res) => {
  const sql = `
    SELECT 
        a.application_id,
        ap.full_name,
        a.application_status,
        DATEDIFF(CURDATE(), zad.submission_date) AS days_pending
    FROM APPLICATIONS a
    JOIN APPLICANTS ap ON a.applicant_id = ap.applicant_id
    JOIN ZAKAT_APPLICATION_DETAILS zad ON a.application_id = zad.application_id
    WHERE a.application_status IN ('Pending', 'In Review')
    ORDER BY zad.submission_date DESC
    LIMIT 5;
  `;
  connection.query(sql, (error, results) => {
    if (error) {
      console.error("Error fetching recent pending applications:", error);
      return res.status(500).json({ message: "Database query failed" });
    }
    res.status(200).json(results);
  });
});


export default router;