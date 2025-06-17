import express from 'express';
import multer from 'multer';
import path from 'path';
import util from 'util';
import connection from '../connection-db.js';
import { protectApplicant } from '../middleware/authMiddleware.js';

const router = express.Router();

// --- Multer Configuration ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

// --- Main Application Submission Route ---
router.post('/applicant/apply', protectApplicant, upload.array('documents', 10), async (req, res) => {
  // Promisify connection methods for use with async/await
  const beginTransaction = util.promisify(connection.beginTransaction).bind(connection);
  const query = util.promisify(connection.query).bind(connection);
  const commit = util.promisify(connection.commit).bind(connection);
  const rollback = util.promisify(connection.rollback).bind(connection);

  try {
    const applicantId = req.user.id;
    const {
      category_id,
      employment_status,
      employer_name,
      employer_address,
      institute_name,
      monthly_income,
      other_income_sources,
      total_household_income,
      monthly_expenses,
      outstanding_debts,
      aid_from_others,
      reason_for_applying,
      spouse_name,
      spouse_employment_status,
      dependents,
      document_types, // Can be a string (1 file) or an array (>1 file)
      declaration,
      consent,
      signature,
    } = req.body;

    // --- FIX 1: Normalize document_types to always be an array ---
    let normalizedDocTypes = [];
    if (document_types) {
      normalizedDocTypes = Array.isArray(document_types) ? document_types : [document_types];
    }

    // --- Data Validation ---
    if (!category_id || !employment_status || !monthly_income || !total_household_income || !reason_for_applying || !declaration || !consent || !signature) {
      return res.status(400).json({ error: 'Missing required form fields' });
    }
    
    // Validation using the normalized array
    if (req.files && req.files.length > 0 && (normalizedDocTypes.length !== req.files.length)) {
        return res.status(400).json({ error: 'Mismatch between number of files and document types.' });
    }

    // --- Data Processing ---
    let parsedDependents = [];
    if (dependents && dependents !== "[]") {
      try {
        parsedDependents = JSON.parse(dependents);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid dependents format.' });
      }
    }
    const declarationInt = declaration === 'true' ? 1 : 0;
    const consentInt = consent === 'true' ? 1 : 0;
    // FIX 2: Handle empty string for spouse status
    const finalSpouseStatus = spouse_employment_status === '' ? null : spouse_employment_status;
    
    // --- Start Database Transaction ---
    await beginTransaction();

    // 1. Insert into APPLICATIONS table
    const randomStaffId = Math.floor(Math.random() * 4) + 1;
    const applicationSql = `INSERT INTO APPLICATIONS (applicant_id, category_id, handled_by) VALUES (?, ?, ?)`;
    const applicationResult = await query(applicationSql, [applicantId, category_id, randomStaffId]);
    const applicationId = applicationResult.insertId;

    // 2. Insert into ZAKAT_APPLICATION_DETAILS table
    const detailSql = `
      INSERT INTO ZAKAT_APPLICATION_DETAILS (
        application_id, employment_status, employer_name, employer_address, institute_name,
        monthly_income, other_income_sources, total_household_income,
        monthly_expenses, outstanding_debts, aid_from_others, reason_for_applying,
        spouse_name, spouse_employment_status, number_of_dependents,
        declaration, consent, signature
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    // FIX 3: Removed the extra comma to align data correctly
    const detailValues = [
      applicationId, employment_status, employer_name, employer_address, institute_name,
      monthly_income, other_income_sources, total_household_income,
      monthly_expenses, outstanding_debts, aid_from_others, reason_for_applying,
      spouse_name, finalSpouseStatus, parsedDependents.length,
      declarationInt, consentInt, signature
    ];

    const detailResult = await query(detailSql, detailValues);
    const detailId = detailResult.insertId;

    // 3. Insert into APPLICATION_DOCUMENTS table
    if (req.files && req.files.length > 0) {
      const documentSql = `INSERT INTO APPLICATION_DOCUMENTS (detail_id, document_type, file_name, file_path, file_size, mime_type) VALUES ?`;
      
      const documentValues = req.files.map((file, index) => [
        detailId,
        normalizedDocTypes[index], // Use the normalized array here
        file.originalname,
        file.path,
        file.size,
        file.mimetype
      ]);

      await query(documentSql, [documentValues]);
    }
    
    // 4. Insert into DEPENDENTS table (if any)
    if (parsedDependents.length > 0) {
      const dependentSql = `INSERT INTO DEPENDENTS (application_id, name, relationship, age) VALUES ?`;
      const dependentValues = parsedDependents.map(d => [applicationId, d.name, d.relationship, d.age]);
      await query(dependentSql, [dependentValues]);
    }

    // --- If all queries were successful, commit the transaction ---
    await commit();
    res.status(201).json({ message: 'Application submitted successfully' });

  } catch (err) {
    // If any query fails, roll back the entire transaction to prevent partial data
    await rollback();
    console.error("Application Submission Error:", err);
    res.status(500).json({ error: 'Failed to submit application due to a server error.' });
  }
});

export default router;