// routes/authApplicants.js
import express from 'express';
import { registerApplicant, getMaritalStatuses } from '../controllers/applicantAuthController.js';

const router = express.Router();

// Public route to get data for the form dropdown
router.get('/marital-statuses', getMaritalStatuses);

// Public route to register a new applicant
router.post('/register/applicant', registerApplicant);

export default router;