// routes/applicantRegister.js
import express from 'express';
import bcrypt from 'bcryptjs';
import connection from '../connection-db.js';

const router = express.Router();

router.post('/register/applicant', async (req, res) => {
  const {
    fullName, nric, dateOfBirth, address, phone, salary, email,
    maritalStatusId, bankName, accountNumber,
    username, password
  } = req.body;

  // --- Start of Validation ---

  // 1. Check for missing required fields
  if (!username || !password || !fullName || !nric || !email) {
    return res.status(400).json({ error: 'Missing required fields for registration.' });
  }

  // ✅ NEW: Enforce Password Strength on the Backend
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ 
      error: "Password does not meet requirements. It must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a symbol (!@#$%^&*)." 
    });
  }
  
  // --- End of Validation ---

  const db = connection.promise();

  try {
    await db.beginTransaction();

    // 1. Create the applicant record
    const applicantQuery = `
      INSERT INTO APPLICANTS 
        (full_name, nric, date_of_birth, address, phone, salary, email, marital_status_id, bank_name, account_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [applicantResult] = await db.query(applicantQuery, [
      fullName, nric, dateOfBirth, address, phone, salary, email,
      maritalStatusId, bankName, accountNumber
    ]);
    const newApplicantId = applicantResult.insertId;

    // 2. Hash the strong password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Create the account record
    const accountQuery = `
      INSERT INTO APPLICANT_ACCOUNTS (applicant_id, username, password)
      VALUES (?, ?, ?)
    `;
    await db.query(accountQuery, [newApplicantId, username, hashedPassword]);

    await db.commit();

    res.status(201).json({ message: 'Applicant registered successfully!', applicantId: newApplicantId });

  } catch (err) {
    await db.rollback();
    console.error('Registration Error:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      if (err.message.includes('username')) {
        return res.status(409).json({ error: 'This username is already taken. Please choose another.' });
      }
      if (err.message.includes('email')) {
        return res.status(409).json({ error: 'An account with this email address already exists.' });
      }
    }
    res.status(500).json({ error: 'An error occurred during the registration process.' });
  }
});

export default router;