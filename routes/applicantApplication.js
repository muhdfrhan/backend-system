// routes/applicantApplication.js
import express from 'express';
import connection from '../connection-db.js';
import { protectApplicant } from '../middleware/authMiddleware.js';
import dayjs from 'dayjs';

const router = express.Router();

// --- MODIFIED HELPER FUNCTION ---
const getStatusDetails = (status) => {
  switch (status) {
    case 'Pending':
      return { title: 'Application Submitted', description: 'Your application has been received and is awaiting the first review.', color: 'info' };

    // --- FIX ---
    // 1. Give 'Documents Requested' its own status
    case 'Documents Requested':
      return { title: 'Documents Requested', description: 'Action Required: We need an additional document to proceed. Please see the note from our staff and use the upload form.', color: 'warning' };

    // 2. Group the remaining "in-progress" statuses
    case 'In Review':
    case 'Pending Interview':
      return { title: 'Under Review', description: 'Our team is currently processing your application. We may contact you if additional information is needed.', color: 'primary' };
    
    // ... rest of the cases remain the same
    case 'Approved':
      return { title: 'Approved', description: 'Congratulations! Your application for aid has been approved. Please wait for disbursement details.', color: 'success' };
    
    case 'Rejected':
      return { title: 'Application Not Approved', description: 'After careful consideration, your application was not approved at this time. You may contact us for more details.', color: 'danger' };
      
    case 'Disbursed':
      return { title: 'Aid Disbursed', description: 'Your Zakat aid has been disbursed. Please check your account.', color: 'success' };
      
    default:
      return { title: 'Unknown Status', description: 'There is an unknown status with your application.', color: 'secondary' };
  }
};
// --- This route handler remains the same, no changes needed ---
router.get('/my-application', protectApplicant, (req, res) => {
  const applicantId = req.user.id;

  const sql = `
    SELECT 
      a.application_id,
      a.application_status,
      a.status_detail, -- <-- ADDED THIS LINE
      a.last_updated,
      c.name AS category_name,
      d.*
    FROM APPLICATIONS a
    JOIN ZAKAT_APPLICATION_DETAILS d ON a.application_id = d.application_id
    JOIN ASNAF_CATEGORIES c ON a.category_id = c.category_id
    WHERE a.applicant_id = ?
    ORDER BY a.application_id DESC
  `;

  connection.query(sql, [applicantId], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Failed to retrieve application data" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "No application found" });
    }
    
    const applicationsList = results.map(application => {
      const statusDetails = getStatusDetails(application.application_status);

      return {
        applicationId: application.application_id,
        categoryName: application.category_name,
        submissionDate: dayjs(application.submission_date).format('DD MMMM YYYY'),
        lastUpdated: dayjs(application.last_updated).format('DD MMMM YYYY, h:mm A'),
        status: {
          title: statusDetails.title,
          description: statusDetails.description,
          color: statusDetails.color,
        },
        details: {
          status_detail: application.status_detail, 
          category_name: application.category_name,
          employment_status: application.employment_status,
          monthly_income: application.monthly_income,
          total_household_income: application.total_household_income,
          reason_for_applying: application.reason_for_applying,
          signature: application.signature,
          declaration: application.declaration,
          consent: application.consent
        }
      };
    });

    res.json(applicationsList);
  });
});

export default router;