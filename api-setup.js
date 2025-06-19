import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import connection from './connection-db.js';


// Import existing routes
import authRoutes from './routes/auth.js';
//import authApplicantsRoutes from './routes/authApplicants.js';
import staffDashboardRoutes from './routes/staffDashboard.js';
import viewApplicantRoutes from './routes/StaffViewApplicant.js';
import staffProfileRoutes from './routes/staffProfile.js';
import registerRoutes from './routes/applicantRegister.js';
import applicantDashboardRoutes from './routes/applicantDashboard.js';
import applicationRoutes from './routes/StaffApplications.js';
import applicantProfileRoutes from './routes/applicantProfile.js';
import applicantAuthRoutes from './routes/authApplicants.js';
import asnafCategoriesRoutes from './routes/asnaf-categories.js';
import applyZakatRoutes from './routes/applyZakat.js';
import applicantApplicationRoutes from './routes/applicantApplication.js';
import maritalStatusesRoutes from './routes/marital-statuses.js';
import additionalDocumentRoutes from './routes/additionalDocument.js';
import financeloginroutes from './routes/financeAuth.js';
import financeActionsRoutes from './routes/financeActions.js';
import authAdminRoutes from './routes/authAdmin.js';
import reportRoutes from './routes/reportRoutes.js'; // <-- 1. Is this import correct?
//import financeRoutes from './routes/finance.js';


const app = express();
const PORT = 3000;


app.use(cors());
app.use(bodyParser.json());

// Mount existing routes
app.use('/api', authRoutes);

//app.use('/api', authApplicantsRoutes);

// Group staff-specific routes under /api/staff
app.use('/api', staffDashboardRoutes);
app.use('/api', viewApplicantRoutes);
app.use('/api', staffProfileRoutes);

// ✅ Mount the new applications management routes (can be top-level or under /staff)
app.use('/api', applicationRoutes);
//app.use('/api/detail/:applicationId', applicationRoutes);
//app.use('/api/update/:applicationId', applicationRoutes);
app.use('/api', applicantProfileRoutes);
app.use('/api', applicantAuthRoutes);


app.use('/api', registerRoutes);
app.use('/api', applicantDashboardRoutes);
app.use('/api', asnafCategoriesRoutes);
app.use('/api', maritalStatusesRoutes);
app.use('/api', applyZakatRoutes);
app.use('/api', applicantApplicationRoutes);
app.use('/api', additionalDocumentRoutes);


app.use('/api', financeloginroutes);
app.use('/api', financeActionsRoutes);

app.use('/api/auth/admin', authAdminRoutes); 
app.use('/api/reports', reportRoutes);
// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(PORT, () => {
  console.log(`✅ Server is running and accessible on http://192.168.0.240:${PORT}`);
});

