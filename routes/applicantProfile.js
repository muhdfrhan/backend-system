// routes/applicantProfile.js
import express from 'express';
import bcrypt from 'bcryptjs';
import connection from '../connection-db.js';
import { protectApplicant } from '../middleware/authMiddleware.js';

const router = express.Router();

// ✅ FIX: Modified GET endpoint to include bank details
router.get('/ApplcnProfile', protectApplicant, async (req, res) => {
  const applcnIdFromToken = req.user.id;

  if (!applcnIdFromToken) {
    return res.status(400).json({ error: 'Applicant ID not found in token' });
  }

  // Add A.bank_name and A.account_number to the SELECT statement
  const sqlQuery = `
   SELECT A.applicant_id, AC.username, A.full_name, A.nric, A.date_of_birth, 
          A.address, A.phone, A.salary, A.email, MS.status_name, A.marital_status_id,
          A.bank_name, A.account_number
   FROM APPLICANTS A
   JOIN MARITAL_STATUSES MS ON A.marital_status_id = MS.status_id
   JOIN APPLICANT_ACCOUNTS AC ON AC.applicant_id = A.applicant_id
   WHERE A.applicant_id = ?;
  `;

  try {
    const [rows] = await connection.promise().query(sqlQuery, [applcnIdFromToken]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Applicant profile not found.' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Database error fetching applicant profile:', err);
    res.status(500).json({ error: 'Failed to fetch applicant profile' });
  }
});


// ✅ FIX: Modified PUT endpoint to handle bank details and password validation
router.put('/ApplcnProfile', protectApplicant, async (req, res) => {
  const applcnIdFromToken = req.user.id;
  
  // Destructure all fields, including the new bank details
  const { 
    email, phone, salary, address, marital_status_id, 
    bank_name, account_number, // <-- New fields
    username, password 
  } = req.body;

  // --- Server-side Validation ---
  if (!email || !phone || !address || !marital_status_id || !username || !bank_name || !account_number) {
    return res.status(400).json({ error: 'All personal and contact fields are required.' });
  }

  // Validate password strength ONLY if a new password is provided
  if (password) {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        error: "Password does not meet requirements. It must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a symbol (!@#$%^&*)." 
      });
    }
  }

  const db = await connection.promise();
  
  try {
    await db.beginTransaction();

    // 1. Update the APPLICANTS table with the new bank details
    const applicantsQuery = `
      UPDATE APPLICANTS
      SET email = ?, phone = ?, salary = ?, address = ?, marital_status_id = ?,
          bank_name = ?, account_number = ?
      WHERE applicant_id = ?;
    `;
    await db.query(applicantsQuery, [
      email, phone, salary, address, marital_status_id, 
      bank_name, account_number, 
      applcnIdFromToken
    ]);

    // 2. Update the APPLICANT_ACCOUNTS table
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      await db.query('UPDATE APPLICANT_ACCOUNTS SET username = ?, password = ? WHERE applicant_id = ?', [username, hashedPassword, applcnIdFromToken]);
    } else {
      await db.query('UPDATE APPLICANT_ACCOUNTS SET username = ? WHERE applicant_id = ?', [username, applcnIdFromToken]);
    }

    await db.commit();
    res.json({ message: 'Profile updated successfully' });

  } catch (err) {
    await db.rollback();
    console.error('Database error updating applicant profile:', err);
    res.status(500).json({ error: 'Failed to update applicant profile' });
  }
});

export default router;