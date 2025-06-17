// BACKEND-SYSTEM/routes/reportRoutes.js

import express from 'express';
import connection from '../connection-db.js'; // Your DB connection
import { verifyToken } from '../middleware/authMiddleware.js'; // Assuming you have auth middleware

const router = express.Router();

// ROUTE 1: GET Application Status Funnel
// Endpoint: GET /api/reports/status-funnel
router.get('/status-funnel', (req, res) => {
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

// ROUTE 2: GET Applications by Asnaf Category
// Endpoint: GET /api/reports/category-breakdown
router.get('/category-breakdown', (req, res) => {
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

export default router;