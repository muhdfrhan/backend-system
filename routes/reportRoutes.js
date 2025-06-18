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
router.get('/status-funnel', protectAdmin, (req, res) => {
  const sql = 'CALL GetStatusFunnelReport();'; // Much cleaner!

  connection.query(sql, (error, results) => {
    if (error) {
      console.error("Error fetching status funnel:", error);
      return res.status(500).json({ message: "Database query failed" });
    }
    res.status(200).json(results[0]);
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
    // Just one call to the database!
    const sql = 'CALL GetKPISummary();';
    const [results] = await connection.promise().query(sql);

    // The result is an array containing one object with all our KPIs
    const kpiData = results[0][0];

    res.json({
      totalApproved: kpiData.totalApproved,
      totalDisbursed: kpiData.totalDisbursed,
      awaitingDisbursement: kpiData.totalApproved - kpiData.totalDisbursed, // Logic remains here
      avgProcessingDays: kpiData.avgProcessingDays
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
  // The complex query is now hidden behind a simple name.
  const sql = 'CALL GetRecentPendingApplications();';

  // Note: The result from a CALL statement can be nested in an extra array.
  // We handle it with results[0].
  connection.query(sql, (error, results) => {
    if (error) {
      console.error("Error fetching recent pending applications:", error);
      return res.status(500).json({ message: "Database query failed" });
    }
    res.status(200).json(results[0]);
  });
});


export default router;