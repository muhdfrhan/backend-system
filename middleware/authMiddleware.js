// middleware/authMiddleware.js
import jwt from 'jsonwebtoken';

// Ensure this JWT_SECRET is the same as in your auth.js and ideally from an environment variable
const JWT_SECRET = 'your_jwt_secret_key';

export const protectStaff = (req, res, next) => 
{
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer '))
 {
    try 
    {
      // Get token from header (e.g., "Bearer <token>")
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);

      // Add user payload (which includes the staff ID) to the request object
      // Assuming your JWT payload has an 'id' field for the staff_id
      req.user = decoded; // e.g., req.user = { id: staff_id, username: '...' }

      next(); // Proceed to the next middleware or route handler
    } catch (error) 
    {
      console.error('Token verification failed:', error);
      return res.status(401).json({ error: 'Not authorized, token failed' });
    }
  }

  if (!token) 
  {
    return res.status(401).json({ error: 'Not authorized, no token' });
  }
};

export const protectApplicant = (req, res, next) => 
{
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer '))
 {
    try 
    {
      // Get token from header (e.g., "Bearer <token>")
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);

      // Add user payload (which includes the staff ID) to the request object
      // Assuming your JWT payload has an 'id' field for the staff_id
      req.user = decoded; // e.g., req.user = { id: staff_id, username: '...' }

      next(); // Proceed to the next middleware or route handler
    } catch (error) 
    {
      console.error('Token verification failed:', error);
      return res.status(401).json({ error: 'Not authorized, token failed' });
    }
  }

  if (!token) 
  {
    return res.status(401).json({ error: 'Not authorized, no token' });
  }
};

export const protectFinance = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);

      // --- ADD THIS CHECK ---
      // Verify that the user has the 'finance' role.
      if (decoded.role !== 'finance') {
        return res.status(403).json({ error: 'Forbidden: Access is restricted to finance staff.' });
      }

      req.user = decoded;
      next();
    } catch (error) {
      console.error('Token verification failed:', error);
      return res.status(401).json({ error: 'Not authorized, token failed' });
    }
  }
  if (!token) {
    return res.status(401).json({ error: 'Not authorized, no token' });
  }
};

export const protectAdmin = (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);

      // --- ADD THIS CHECK ---
      // Verify that the user has the 'admin' role.
      if (decoded.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Access is restricted to admin staff.' });
      }

      req.user = decoded;
      next();
    } catch (error) {
      console.error('Token verification failed:', error);
      return res.status(401).json({ error: 'Not authorized, token failed' });
    }
  }
  if (!token) {
    return res.status(401).json({ error: 'Not authorized, no token' });
  }
};

