// BACKEND-SYSTEM/routes/authAdmin.js
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import connection from '../connection-db.js';

const router = express.Router();

// Get the JWT secret from an environment variable for security
// Fallback to the one from your middleware if not set
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// @route   POST /api/auth/admin/login
// @desc    Authenticate admin staff and return JWT
// @access  Public
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Basic validation
    if (!username || !password) {
        return res.status(400).json({ message: 'Please enter all fields' });
    }

    // Find staff user by username
    const sql = "SELECT user_id, name, username, password, position FROM STAFF WHERE username = ?";
    
    connection.query(sql, [username], (err, results) => {
        if (err) {
            console.error("Database error during admin login:", err);
            return res.status(500).json({ message: 'Server error' });
        }

        // Check if user exists
        if (results.length === 0) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const user = results[0];

        // IMPORTANT: Authorize user based on their position
        // Define which positions are considered 'admin'.
        const adminPositions = ['Zakat Supervisor']; // Add any other admin roles here
        if (!adminPositions.includes(user.position)) {
             return res.status(403).json({ message: 'Access denied. Not an administrator.' });
        }
        
        // User exists, now compare password
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                console.error("Bcrypt error:", err);
                return res.status(500).json({ message: 'Server error during password comparison' });
            }

            if (!isMatch) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }

            // Password matches, create JWT payload
            // This payload MUST match what your 'protectAdmin' middleware expects
            const payload = {
                id: user.user_id,
                username: user.username,
                role: 'admin' // CRITICAL: This role is checked by your middleware
            };

            // Sign the token
            jwt.sign(
                payload,
                JWT_SECRET,
                { expiresIn: '8h' }, // Token expires in 8 hours
                (err, token) => {
                    if (err) throw err;
                    res.json({
                        token,
                        user: {
                            id: user.user_id,
                            name: user.name,
                            username: user.username,
                            position: user.position
                        }
                    });
                }
            );
        });
    });
});

export default router;