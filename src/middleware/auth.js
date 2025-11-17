// middleware/auth.js
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

/**
 * Protect routes - verify JWT token
 * Add this to routes that require authentication
 */
export const protect = async (req, res, next) => {
  try {
    let token;
    
    // Get token from Authorization header
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized - No token provided'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if guest user has expired
    if (user.isGuest && user.guestExpiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        message: 'Guest account has expired'
      });
    }
    
    // Attach user to request object
    req.user = {
      userId: user._id,
      email: user.email,
      isGuest: user.isGuest,
      authType: user.authType
    };
    
    next(); // Continue to route handler
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};