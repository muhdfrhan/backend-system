import express from 'express';
import connection from '../connection-db.js';
import { protectStaff } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/dashboard-stats - Protected route
router.get('/dashboard-stats', protectStaff, async (req, res) => {
  const staffId = req.user.id;

  if (!staffId) {
    return res.status(400).json({ error: 'Staff ID not found in token' });
  }

  try {
    // --- OPTIMIZED: All stats are now fetched in a single database query ---
    const statsSql = `
      SELECT
        -- 1. Total number of applications assigned to this staff
        COUNT(application_id) AS totalApplicationSended,
        
        -- 2. Total number of UNIQUE applicants assigned to this staff
        COUNT(DISTINCT applicant_id) AS totalApplicantsAssigned,
        
        -- 3. Count applications with 'pending' status using conditional aggregation
        COUNT(CASE WHEN application_status = 'pending' THEN 1 END) AS pendingApplications,
        
        -- 4. Count applications with 'approved' status
        COUNT(CASE WHEN application_status = 'approved' THEN 1 END) AS approvedApplications,
        
        -- 5. Count applications with 'in review' status
        COUNT(CASE WHEN application_status = 'in review' THEN 1 END) AS inReviewApplications,
        
        -- 6. Count applications with 'rejected' status
        COUNT(CASE WHEN application_status = 'rejected' THEN 1 END) AS rejectedApplications
      FROM APPLICATIONS
      WHERE handled_by = ?
    `;

    // Execute the single query
    const [statsResult] = await connection.promise().query(statsSql, [staffId]);

    // The result is the first row of the returned array
    const stats = statsResult[0];

    // Send the stats object directly as the response
    res.json({
      totalApplicationSended: Number(stats.totalApplicationSended) || 0,
      totalApplicantsAssigned: Number(stats.totalApplicantsAssigned) || 0,
      pendingApplications: Number(stats.pendingApplications) || 0,
      approvedApplications: Number(stats.approvedApplications) || 0,
      inReviewApplications: Number(stats.inReviewApplications) || 0,
      rejectedApplications: Number(stats.rejectedApplications) || 0,
    });

  } catch (err) {
    console.error('Database error fetching staff dashboard stats:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data for staff' });
  }
});

export default router;