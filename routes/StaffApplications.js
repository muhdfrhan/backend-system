// routes/StaffApplications.js
import express from 'express';
import connection from '../connection-db.js';
import { protectStaff } from '../middleware/authMiddleware.js';

const router = express.Router();

// (The /staff-list route remains unchanged)
router.get('/staff-list', protectStaff, async (req, res) => {
  const loggedInStaffId = req.user.id;

  const query = `
    SELECT
      APP.application_id,
      A.full_name AS applicant_name,
      A.nric AS applicant_nric,
      AC.name AS category_name,
      ZAD.submission_date,
      APP.application_status
    FROM APPLICATIONS APP
    JOIN APPLICANTS A ON APP.applicant_id = A.applicant_id
    JOIN ASNAF_CATEGORIES AC ON APP.category_id = AC.category_id
    LEFT JOIN ZAKAT_APPLICATION_DETAILS ZAD ON APP.application_id = ZAD.application_id
    WHERE APP.handled_by = ?
    ORDER BY ZAD.submission_date DESC, APP.application_id DESC;
  `;

  try {
    const [applications] = await connection.promise().query(query, [loggedInStaffId]);
    res.json(applications);
  } catch (err) {
    console.error('Error fetching applications list:', err);
    res.status(500).json({ error: 'Failed to fetch applications list' });
  }
});


// ------------------------------------------------------------
// GET /api/applications/detail/:applicationId
// ------------------------------------------------------------
router.get('/detail/:applicationId', protectStaff, async (req, res) => {
  const { applicationId } = req.params;

  // This query remains the same, as it already fetches spouse details from ZAKAT_APPLICATION_DETAILS
  const applicationDetailsQuery = `
    SELECT
      APP.application_id, APP.application_status, APP.status_detail, APP.category_id, 
      APP.handled_by AS assigned_staff_id, APP.decision_date, APP.officer_remarks, APP.last_updated,
      A.full_name AS applicant_full_name, A.nric AS applicant_nric, A.date_of_birth AS applicant_dob,
      A.address AS applicant_address, A.phone AS applicant_phone, A.salary AS applicant_base_salary, 
      A.email AS applicant_email, A.marital_status_id,
      AC.name AS category_name,
      S.name AS assigned_staff_name,
      MS.status_name AS applicant_marital_status,
      ZAD.detail_id, 
      ZAD.submission_date, ZAD.employment_status, ZAD.employer_name, 
      ZAD.employer_address, ZAD.monthly_income, ZAD.other_income_sources, 
      ZAD.total_household_income, ZAD.monthly_expenses, ZAD.outstanding_debts, 
      ZAD.aid_from_others, ZAD.reason_for_applying, ZAD.number_of_dependents,
      ZAD.spouse_name, ZAD.spouse_employment_status, ZAD.institute_name,
      ZAD.declaration, ZAD.consent, ZAD.signature
    FROM APPLICATIONS APP
    JOIN APPLICANTS A ON APP.applicant_id = A.applicant_id
    JOIN ASNAF_CATEGORIES AC ON APP.category_id = AC.category_id
    LEFT JOIN STAFF S ON APP.handled_by = S.user_id
    LEFT JOIN MARITAL_STATUSES MS ON A.marital_status_id = MS.status_id
    LEFT JOIN ZAKAT_APPLICATION_DETAILS ZAD ON APP.application_id = ZAD.application_id
    WHERE APP.application_id = ?;
  `;

  const documentsQuery = `
    SELECT document_id, document_type, file_name, file_path, uploaded_at, mime_type
    FROM APPLICATION_DOCUMENTS
    WHERE detail_id = ?;
  `;

  // --- NEW QUERY TO FETCH DEPENDENTS ---
  const dependentsQuery = `
    SELECT dependent_id, name, relationship, age
    FROM DEPENDENTS
    WHERE application_id = ?;
  `;

  try {
    const [rows] = await connection.promise().query(applicationDetailsQuery, [applicationId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    const applicationDetails = rows[0];

    // Fetch documents (as before)
    let documentsList = [];
    if (applicationDetails.detail_id) {
      const [documents] = await connection.promise().query(documentsQuery, [applicationDetails.detail_id]);
      documentsList = documents;
    }

    // --- FETCH DEPENDENTS ---
    const [dependents] = await connection.promise().query(dependentsQuery, [applicationId]);
    const dependentsList = dependents;

    // --- ADD DEPENDENTS TO THE FINAL JSON RESPONSE ---
    res.json({
      ...applicationDetails,
      documents: documentsList,
      dependents: dependentsList // <-- Added dependents list
    });

  } catch (err) {
    console.error(`Error fetching application details for ID ${applicationId}:`, err);
    res.status(500).json({ error: 'Failed to fetch application details' });
  }
});


// (The /update/:applicationId route remains unchanged)
router.put('/update/:applicationId', protectStaff, async (req, res) => {
  const { applicationId } = req.params;
  
  // FIX: Destructure the new approved_amount field from the request body
  const { application_status, officer_remarks, status_detail, approved_amount } = req.body;
  const staffId = req.user.id;

  // FIX: Add server-side validation to ensure an amount is provided upon approval
  if (application_status === 'Approved' && (!approved_amount || parseFloat(approved_amount) <= 0)) {
    return res.status(400).json({ error: 'A valid approved amount must be provided when approving an application.' });
  }

  // Use current date for decision_date if status is final (Approved/Rejected), otherwise keep existing
  const decision_date_query_part = (application_status === 'Approved' || application_status === 'Rejected')
    ? 'CURDATE()'
    : 'decision_date';

  // FIX: Add `approved_amount` to the SQL query.
  // The query is now more robust and only updates the decision date when needed.
  const query = `
    UPDATE APPLICATIONS
    SET
      application_status = ?,
      officer_remarks = ?,
      status_detail = ?,
      approved_amount = ?,
      decision_date = ${decision_date_query_part},
      handled_by = ?
    WHERE application_id = ?;
  `;

  try {
    // FIX: If the status is not 'Approved', we force the amount to be 0 for data integrity.
    const finalAmount = application_status === 'Approved' ? approved_amount : 0;

    const [result] = await connection.promise().query(query, [
      application_status,
      officer_remarks,
      status_detail,
      finalAmount, // Pass the final, validated amount
      staffId,
      applicationId
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Application not found or not updated' });
    }

    res.json({ message: 'Application updated successfully' });
  } catch (err) {
    console.error('Error updating application:', err);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

export default router;