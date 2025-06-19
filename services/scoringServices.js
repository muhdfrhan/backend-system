// In a new file like services/scoringService.js or at the top of StaffApplications.js

import connection from '../connection-db.js'; // Make sure connection is imported

// --- Configuration (Keep these in a central config file later) ---
const POVERTY_LINE_INCOME = 2208; // Example: Malaysian Poverty Line Income (adjust as needed)
const NISAB_THRESHOLD = 25000; // Example: Current Nisab value in RM (update periodically)
const POINTS = {
    // Financial (Weight: 50%)
    INCOME_VS_POVERTY: { MAX: 30, WEIGHT: 0.5 },
    DEBT_VS_INCOME: { MAX: 10, WEIGHT: 0.5 },
    // Household (Weight: 30%)
    DEPENDENTS: { MAX: 20, WEIGHT: 0.3 },
    MARITAL_STATUS: { MAX: 10, WEIGHT: 0.3 },
    // Circumstances (Weight: 20%)
    ASNAF_CATEGORY: { MAX: 20, WEIGHT: 0.2 },
};

async function calculateAndSaveScore(applicationId) {
    // 1. Fetch all necessary data for the applicant in one go
    const query = `
        SELECT
            A.salary AS applicant_salary,
            MS.status_name AS marital_status,
            ZAD.total_household_income,
            ZAD.outstanding_debts,
            ZAD.number_of_dependents,
            AC.name AS asnaf_category,
            (SELECT COUNT(*) FROM DEPENDENTS D WHERE D.application_id = APP.application_id) AS dependent_count
        FROM APPLICATIONS APP
        JOIN APPLICANTS A ON APP.applicant_id = A.applicant_id
        LEFT JOIN ZAKAT_APPLICATION_DETAILS ZAD ON APP.application_id = ZAD.application_id
        LEFT JOIN MARITAL_STATUSES MS ON A.marital_status_id = MS.status_id
        LEFT JOIN ASNAF_CATEGORIES AC ON APP.category_id = AC.category_id
        WHERE APP.application_id = ?;
    `;
    const [rows] = await connection.promise().query(query, [applicationId]);
    if (rows.length === 0) {
        throw new Error('Application data not found for scoring.');
    }
    const data = rows[0];

    // --- Start Scoring Logic ---
    let financial_score = 0;
    let household_score = 0;
    let circumstances_score = 0;

    // A. Financial Score Calculation
    const householdIncome = parseFloat(data.total_household_income) || 0;
    const incomeRatio = householdIncome / POVERTY_LINE_INCOME;
    if (incomeRatio <= 0.25) financial_score += 30;
    else if (incomeRatio <= 0.50) financial_score += 20;
    else if (incomeRatio <= 0.75) financial_score += 10;
    else if (incomeRatio <= 1.0) financial_score += 5;

    const debts = parseFloat(data.outstanding_debts) || 0;
    if (debts > householdIncome * 3) financial_score += 10; // Debt is > 3x monthly income
    else if (debts > householdIncome) financial_score += 5;

    // B. Household Score Calculation
    const numDependents = data.dependent_count || data.number_of_dependents || 0;
    if (numDependents >= 5) household_score += 20;
    else if (numDependents >= 3) household_score += 15;
    else if (numDependents >= 1) household_score += 10;

    if (data.marital_status === 'Widowed' || data.marital_status === 'Divorced') {
        household_score += 10;
    }

    // C. Circumstances Score Calculation
    // Give high points for specific Asnaf categories
    switch(data.asnaf_category) {
        case 'Fakir': circumstances_score += 20; break;
        case 'Miskin': circumstances_score += 15; break;
        case 'Gharimin': circumstances_score += 15; break; // In debt
        case 'Ibnus Sabil': circumstances_score += 10; break; // Traveler
        case 'Muallaf': circumstances_score += 5; break;
    }
    
    // D. Calculate final weighted score
    const total_priority_score = Math.round(
        (financial_score * POINTS.INCOME_VS_POVERTY.WEIGHT) +
        (household_score * POINTS.DEPENDENTS.WEIGHT) +
        (circumstances_score * POINTS.ASNAF_CATEGORY.WEIGHT)
    );

    // E. Determine Recommendation
    let system_recommendation = 'Standard Review';
    if (total_priority_score >= 85) system_recommendation = 'High Priority / Critical';
    else if (total_priority_score >= 70) system_recommendation = 'High Priority';
    else if (total_priority_score <= 40) system_recommendation = 'Low Priority / Further Review Needed';

    const scoreData = {
        application_id: applicationId,
        financial_score,
        household_score,
        circumstances_score,
        total_priority_score,
        eligibility_status: 'Eligible', // Basic eligibility for now, can be enhanced
        system_recommendation,
        poverty_line_used: POVERTY_LINE_INCOME,
        nisab_threshold_used: NISAB_THRESHOLD,
    };
    
    // 3. Save the score to the database
    const saveQuery = `
        INSERT INTO APPLICATION_SCORES (application_id, financial_score, household_score, circumstances_score, total_priority_score, eligibility_status, system_recommendation, poverty_line_used, nisab_threshold_used)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        financial_score = VALUES(financial_score), household_score = VALUES(household_score), circumstances_score = VALUES(circumstances_score), total_priority_score = VALUES(total_priority_score), eligibility_status = VALUES(eligibility_status), system_recommendation = VALUES(system_recommendation), poverty_line_used = VALUES(poverty_line_used), nisab_threshold_used = VALUES(nisab_threshold_used), calculated_at = NOW();
    `;
    await connection.promise().query(saveQuery, Object.values(scoreData));

    return scoreData;
}

// Export it if it's in a separate file
export { calculateAndSaveScore };