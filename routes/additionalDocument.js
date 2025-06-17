// routes/additionalDocument.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import connection from '../connection-db.js';
import { protectApplicant } from '../middleware/authMiddleware.js'; // Assuming you have this

const router = express.Router();

// 1. Configure Multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Make sure 'uploads' directory exists
  },
  filename: (req, file, cb) => {
    // Create a unique filename to prevent overwrites
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

// 2. Define the new upload endpoint
// POST /api/applicant/upload-document/:applicationId
router.post(
  '/upload-document/:applicationId',
  protectApplicant, // Middleware to ensure applicant is logged in
  upload.single('document'), // 'document' must match the FormData key from the frontend
  async (req, res) => {
    const { applicationId } = req.params;
    const applicantId = req.user.id; // Get applicant ID from JWT token

    // Check if a file was actually uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No file was uploaded.' });
    }

    try {
      const db = connection.promise();

      // 3. Security Check: Verify the logged-in applicant owns this application
      const [appRows] = await db.query(
        'SELECT applicant_id FROM APPLICATIONS WHERE application_id = ?',
        [applicationId]
      );

      if (appRows.length === 0) {
        return res.status(404).json({ error: 'Application not found.' });
      }
      if (appRows[0].applicant_id !== applicantId) {
        return res.status(403).json({ error: 'Forbidden. You do not own this application.' });
      }

      // 4. Get the detail_id associated with the application_id
      const [detailRows] = await db.query(
        'SELECT detail_id FROM ZAKAT_APPLICATION_DETAILS WHERE application_id = ?',
        [applicationId]
      );

      if (detailRows.length === 0) {
        return res.status(404).json({ error: 'Application details not found.' });
      }
      const detail_id = detailRows[0].detail_id;
      
      // 5. Insert the new document record into the database
      const { filename, path: filePath, size: fileSize, mimetype: mimeType } = req.file;
      const document_type = req.body.document_type || 'Additional Document'; // Optional type from form

      const insertQuery = `
        INSERT INTO APPLICATION_DOCUMENTS (detail_id, document_type, file_name, file_path, file_size, mime_type)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      await db.query(insertQuery, [detail_id, document_type, filename, filePath, fileSize, mimeType]);

      // 6. (Optional but recommended) Update the application status back to "In Review"
      const updateStatusQuery = `
        UPDATE APPLICATIONS SET application_status = 'In Review', status_detail = 'New document submitted by applicant.'
        WHERE application_id = ?
      `;
      await db.query(updateStatusQuery, [applicationId]);
      
      res.json({ message: 'Document uploaded successfully. Your application is now back under review.' });

    } catch (err) {
      console.error('Error uploading additional document:', err);
      res.status(500).json({ error: 'Server error during file upload.' });
    }
  }
);

export default router;