// routes/applicationManagement.js
import express from 'express';
import connection from '../connection-db.js';
import { protectStaff } from '../middleware/authMiddleware.js';

const router = express.Router();

// Endpoint 1: List Applications (e.g., assigned to the logged-in staff)
// GET /api/applications/list
router.get('/list', protectStaff, async (req, res) => {
  const staffId = req.user.id; // ID of the logged-in staff from JWT

  // Modify this query based on whether you want to show applications:
  // 1. ONLY assigned to this staff (WHERE APP.user_id = ?)
  // 2. All applications (if staff has supervisor/admin rights - remove/adjust WHERE clause for staffId)
  // For now, let's assume it lists applications assigned to the logged-in staff.
  const listQuery = `
    SELECT
      APP.application_id,
      A.full_name AS applicant_name,
      A.nric AS applicant_nric,
      AC.name AS category_name,
      ZAD.submission_date,
      APP.application_status,
      S_assigned.name AS assigned_staff_name -- Staff member who is assigned this application
      -- If you want to show who *created* the application (if different), add another join for APP.created_by_staff_id (if such a column exists)
    FROM APPLICATIONS APP
    JOIN APPLICANTS A ON APP.applicant_id = A.applicant_id
    JOIN ASNAF_CATEGORIES AC ON APP.category_id = AC.category_id
    LEFT JOIN ZAKAT_APPLICATION_DETAILS ZAD ON APP.application_id = ZAD.application_id
    LEFT JOIN STAFF S_assigned ON APP.handled_by = S_assigned.user_id -- user_id in APPLICATIONS is the assigned staff
    WHERE APP.handled_by = ?  -- Filter by applications assigned to the logged-in staff
    ORDER BY ZAD.submission_date DESC, APP.application_id DESC;
  `;

  try {
    const [applications] = await connection.promise().query(listQuery, [staffId]);
    res.json(applications);
  } catch (err) {
    console.error('Database error fetching applications list:', err);
    res.status(500).json({ error: 'Failed to fetch applications list' });
  }
});


// Endpoint 2: Get Single Application Detail
// GET /api/applications/detail/:applicationId
router.get('/detail/:applicationId', protectStaff, async (req, res) => {
  const { applicationId } = req.params;
  const staffIdViewing = req.user.id; // ID of the staff viewing the application

  // You might want to add a check here:
  // Does this staffIdViewing have permission to view this specific applicationId?
  // e.g., is it assigned to them, or are they a supervisor?
  // For now, we'll assume if they are staff, they can view any application detail.

  const detailQuery = `
    SELECT
      -- Core Application Info
      APP.application_id,
      APP.application_status,
      APP.status_detail,
      APP.decision_date,
      APP.officer_remarks,
      AC.name AS category_name,
      S_assigned.name AS assigned_staff_name,
      S_assigned.user_id AS assigned_staff_id,

      -- Applicant Personal Details
      A.applicant_id AS main_applicant_id, A.full_name AS applicant_full_name, A.nric AS applicant_nric,
      A.date_of_birth AS applicant_dob, A.address AS applicant_address,
      A.phone AS applicant_phone, A.salary AS applicant_reported_salary, A.email AS applicant_email,
      MS.status_name AS applicant_marital_status,

      -- Zakat Application Details
      ZAD.submission_date, ZAD.employment_status, ZAD.employer_name, ZAD.employer_address,
      ZAD.monthly_income AS zad_monthly_income, ZAD.other_income_sources, ZAD.total_household_income,
      ZAD.monthly_expenses, ZAD.outstanding_debts, ZAD.aid_from_others, ZAD.reason_for_applying,
      ZAD.number_of_dependents AS zad_number_of_dependents, ZAD.spouse_name, ZAD.spouse_employment_status,
      ZAD.children_info, ZAD.other_dependents AS zad_other_dependents_text, ZAD.documents,
      ZAD.declaration, ZAD.consent, ZAD.signature
    FROM APPLICATIONS APP
    JOIN APPLICANTS A ON APP.applicant_id = A.applicant_id
    JOIN ASNAF_CATEGORIES AC ON APP.category_id = AC.category_id
    LEFT JOIN STAFF S_assigned ON APP.handled_by = S_assigned.user_id
    LEFT JOIN MARITAL_STATUSES MS ON A.marital_status_id = MS.status_id
    LEFT JOIN ZAKAT_APPLICATION_DETAILS ZAD ON APP.application_id = ZAD.application_id
    WHERE APP.application_id = ?;
  `;

  const dependentsQuery = `
    SELECT dependent_id, name, relationship, age
    FROM DEPENDENTS
    WHERE application_id = ?;
  `;

  const aidQuery = `
    SELECT
      ZA.aid_id, ZA.aid_type, ZA.amount, ZA.disbursed_date, ZA.notes,
      S_disbursed.name AS disbursed_by_staff_name
    FROM ZAKAT_AID ZA
    LEFT JOIN STAFF S_disbursed ON ZA.disbursed_by = S_disbursed.user_id
    WHERE ZA.application_id = ?;
  `;

  // External Data query if needed (can be complex, simplified here)
  // const externalDataQuery = `SELECT source, data_type, value, retrieved_at FROM EXTERNAL_DATA WHERE applicant_id = ?;`;

  try {
    const [applicationDetailsRows] = await connection.promise().query(detailQuery, [applicationId]);

    if (applicationDetailsRows.length === 0) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    const applicationData = applicationDetailsRows[0];
    const applicantIdForSubQueries = applicationData.main_applicant_id; // Get applicant_id from main query result

    const [dependents] = await connection.promise().query(dependentsQuery, [applicationId]);
    const [aidRecords] = await connection.promise().query(aidQuery, [applicationId]);
    // const [externalDataRecords] = await connection.promise().query(externalDataQuery, [applicantIdForSubQueries]); // If fetching external data

    // Combine all data into a single response object
    res.json({
      ...applicationData,
      dependents: dependents || [],
      aid_records: aidRecords || [],
      // external_data: externalDataRecords || [] // If fetching external data
    });

  } catch (err) {
    console.error(`Database error fetching detail for application ${applicationId}:`, err);
    res.status(500).json({ error: 'Failed to fetch application detail' });
  }
});


// Endpoint 3: Update Application Status and Details (Example)
// PUT /api/applications/update/:applicationId
router.put('/update/:applicationId', protectStaff, async (req, res) => {
    const { applicationId } = req.params;
    const staffId = req.user.id; // Staff making the update

    // Fields that can be updated by staff
    const {
        application_status,
        status_detail,
        officer_remarks,
        // decision_date // Handle date formatting carefully if sent from frontend
    } = req.body;

    // Validate input (basic example)
    if (!application_status) {
        return res.status(400).json({ error: 'Application status is required.' });
    }
    const validStatuses = ['Pending','In Review','Rejected','Approved'];
    if (!validStatuses.includes(application_status)) {
        return res.status(400).json({ error: 'Invalid application status provided.' });
    }

    let decisionDateToSet = req.body.decision_date;
    if (application_status === 'Approved' || application_status === 'Rejected') {
        if (!decisionDateToSet) {
            decisionDateToSet = new Date(); // Set current date if approved/rejected and no date provided
        }
    } else {
        decisionDateToSet = null; // Clear decision date if status is not approved/rejected
    }


    const updateQuery = `
        UPDATE APPLICATIONS
        SET
            application_status = ?,
            status_detail = ?,
            officer_remarks = ?,
            decision_date = ?,
            handled_by = ? -- Re-assign or confirm assignment to current staff (optional logic)
        WHERE application_id = ?;
    `;

    try {
        // Add checks here: Does the staff have permission to update *this* application?
        // Is the status transition valid? (e.g., can't go from Approved to Pending) - more complex logic

        const [result] = await connection.promise().query(updateQuery, [
            application_status,
            status_detail,
            officer_remarks,
            decisionDateToSet,
            staffId, // Assuming the staff making the update becomes the assigned officer
            applicationId
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Application not found or no changes made.' });
        }

        res.json({ message: 'Application updated successfully.' });

    } catch (err) {
        console.error(`Database error updating application ${applicationId}:`, err);
        res.status(500).json({ error: 'Failed to update application' });
    }
});


export default router;