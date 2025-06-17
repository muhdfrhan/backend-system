// middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import connection from '../connection-db.js';

// Ensure this secret is the same one used in your auth.js route
const JWT_SECRET = process.env.JWT_SECRET || 'your_default_secret_key'; 

const protect = (allowedRoles) => async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header (e.g., 'Bearer eyJhbGci...')
      token = req.headers.authorization.split(' ')[1];

      // Verify the token's signature and get the payload
      const decoded = jwt.verify(token, JWT_SECRET);

      // Check if the user's role from the token is in the list of allowed roles
      if (!allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ message: 'Forbidden: You do not have permission for this action.' });
      }
      
      // Attach user info to the request for later use
      req.user = { id: decoded.id, role: decoded.role };
      next(); // Success, proceed to the next function (the actual route handler)

    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({ message: 'Not authorized, token failed.' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided.' });
  }
};

// --- EXPORTED MIDDLEWARE FOR EACH ROLE ---
// Now we can easily create protectors for any role we need.
export const protectFinance = protect(['Finance']);
// Example for a future "Admin" role that can access both staff and finance routes
// export const protectAdmin = protect(['Admin', 'Staff', 'Finance']); 