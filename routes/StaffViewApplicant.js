// routes/viewApplicant.js
import express from 'express';
import connection from '../connection-db.js';
import { protectStaff } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/staff/assigned-applicants (Existing endpoint)
router.get('/assigned-applicants', protectStaff, async (req, res) => {
  const staffId = req.user.id;
  if (!staffId) {
    return res.status(400).json({ error: 'Staff ID not found in token' });
  }
  const sqlQuery = `
    SELECT
      distinct(A.applicant_id), A.nric, A.full_name, A.address, A.email, A.phone,
      A.date_of_birth, A.salary, MS.status_name AS marital_status
    FROM APPLICANTS A
    JOIN MARITAL_STATUSES MS ON A.marital_status_id = MS.status_id
    JOIN APPLICATIONS AP ON AP.applicant_id = A.applicant_id
    WHERE AP.handled_by = ?;
  `;
  try {
    const [rows] = await connection.promise().query(sqlQuery, [staffId]);
    res.json(rows);
  } catch (err) {
    console.error('Database error fetching assigned applicants:', err);
    res.status(500).json({ error: 'Failed to fetch assigned applicants' });
  }
});

// ✅ NEW ENDPOINT: GET /api/staff/applicant/:applicantId - Fetches details for a single applicant
router.get('/applicant/:applicantId', protectStaff, async (req, res) => {
  const { applicantId } = req.params; // Get applicantId from URL parameter
  // const staffId = req.user.id; // Staff ID is available if you need to check if this staff *can* view this applicant

  if (!applicantId) {
    return res.status(400).json({ error: 'Applicant ID parameter is required.' });
  }

  // This query fetches details for a specific applicant.
  // You might want to also join with APPLICATIONS if you need application-specific details
  // for this applicant (like application status, submission date, program, etc.)
  // For now, it matches the fields you want to display: salary, address, DOB, plus existing ones.
  const sqlQuery = `
    SELECT
      A.applicant_id,
      A.nric,
      A.full_name,
      A.address,
      A.email,
      A.phone,
      A.date_of_birth,
      A.salary,
      MS.status_name AS marital_status
    FROM APPLICANTS A
    LEFT JOIN MARITAL_STATUSES MS -- Use LEFT JOIN in case marital_status_id is NULL
      ON A.marital_status_id = MS.status_id
    WHERE A.applicant_id = ?;
  `;

  try {
    const [rows] = await connection.promise().query(sqlQuery, [applicantId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Applicant not found.' });
    }
    // The query returns an object with date_of_birth potentially as a Date object.
    // Convert it to a more friendly string format if needed, or let the frontend handle it.
    // For simplicity, sending as is. Frontend can format using new Date().toLocaleDateString().
    res.json(rows[0]); // Send the single applicant object
  } catch (err) {
    console.error(`Database error fetching applicant ${applicantId}:`, err);
    res.status(500).json({ error: 'Failed to fetch applicant details' });
  }
});

export default router;