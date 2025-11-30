import { User } from '../models/User.js';
import { jwtService } from '../utils/jwt.js';

/**
 * Protect routes - verify JWT token
 * For routes that require authentication
 */
export const protect = async (req, res, next) => {
  try {
    let token;
    
    // Extract token from Authorization header
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
    const decoded = jwtService.verifyAccessToken(token);
    
    // Find user
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists'
      });
    }
    
    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deactivated'
      });
    }
    
    // Check if password was changed after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        success: false,
        message: 'Password recently changed. Please log in again.'
      });
    }
    
    // Check guest expiration
    if (user.isGuest && user.guestExpiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        message: 'Guest account expired'
      });
    }
    
    // Attach user to request
    req.user = {
      userId: user._id,
      email: user.email,
      name: user.name,
      isGuest: user.isGuest,
      authType: user.authType,
      isEmailVerified: user.isEmailVerified
    };
    
    next();
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    return res.status(401).json({
      success: false,
      message: error.message || 'Authentication failed'
    });
  }
};

/**
 * Require email verification
 * Use after protect middleware
 */
export const requireVerification = (req, res, next) => {
  if (!req.user.isEmailVerified && req.user.authType === 'email') {
    return res.status(403).json({
      success: false,
      message: 'Please verify your email address to access this resource'
    });
  }

  next();
};

/**
 * Restrict to registered users only (no guests)
 */
export const restrictToRegistered = (req, res, next) => {
  if (req.user.isGuest) {
    return res.status(403).json({
      success: false,
      message: 'This feature is only available to registered users.'
    });
  }
  
  next();
};