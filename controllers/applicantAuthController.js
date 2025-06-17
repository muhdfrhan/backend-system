// controllers/applicantAuthController.js
import bcrypt from 'bcryptjs';
import connection from '../connection-db.js';

/**
 * @desc    Fetch all marital statuses for the registration form
 * @route   GET /api/marital-statuses
 * @access  Public
 */
export const getMaritalStatuses = async (req, res) => {
  try {
    const [rows] = await connection.promise().query("SELECT status_id, status_name FROM MARITAL_STATUSES");
    res.json(rows);
  } catch (err) {
    console.error('Database error fetching marital statuses:', err);
    res.status(500).json({ error: 'Failed to fetch marital statuses' });
  }
};

/**
 * @desc    Register a new applicant
 * @route   POST /api/register/applicant
 * @access  Public
 */
export const registerApplicant = async (req, res) => {
  const {
    fullName, nric, dateOfBirth, address, phone, salary, email, maritalStatusId,
    username, password
  } = req.body;

  // --- Basic Validation ---
  if (!fullName || !nric || !email || !username || !password || !maritalStatusId) {
    return res.status(400).json({ error: 'Please provide all required fields.' });
  }

  const db = await connection.promise();

  try {
    // --- Use a Transaction for Atomicity ---
    await db.beginTransaction();

    // 1. Insert into APPLICANTS table
    const applicantQuery = `
      INSERT INTO APPLICANTS (full_name, nric, date_of_birth, address, phone, salary, email, marital_status_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const [applicantResult] = await db.query(applicantQuery, [
      fullName, nric, dateOfBirth, address, phone, salary, email, maritalStatusId
    ]);

    const newApplicantId = applicantResult.insertId;

    // 2. Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Insert into APPLICANT_ACCOUNTS table
    const accountQuery = `
      INSERT INTO APPLICANT_ACCOUNTS (applicant_id, username, password)
      VALUES (?, ?, ?);
    `;
    await db.query(accountQuery, [newApplicantId, username, hashedPassword]);

    // If all queries succeed, commit the transaction
    await db.commit();

    res.status(201).json({ message: 'Applicant registered successfully!' });

  } catch (err) {
    // If any query fails, roll back the transaction
    await db.rollback();

    console.error('Registration Error:', err);
    
    // Handle specific errors like duplicate entry
    if (err.code === 'ER_DUP_ENTRY') {
      if (err.message.includes('email')) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
      if (err.message.includes('username')) {
        return res.status(409).json({ error: 'This username is already taken.' });
      }
    }
    
    res.status(500).json({ error: 'Server error during registration.' });
  }
};