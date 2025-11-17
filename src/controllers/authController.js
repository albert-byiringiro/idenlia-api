import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';

/**
 * Generate JWT token for a user
 */
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * Create a guest user account
 * POST /api/auth/guest
 */
export const createGuestUser = async (req, res) => {
  try {
    const guestUser = new User();
    guestUser.setAsGuest();
    
    await guestUser.save();
    
    const token = generateToken(guestUser._id);
    
    res.status(201).json({
      success: true,
      message: 'Guest account created',
      data: {
        user: {
          id: guestUser._id,
          name: guestUser.name,
          isGuest: guestUser.isGuest,
          expiresAt: guestUser.guestExpiresAt
        },
        token
      }
    });
    
  } catch (error) {
    console.error('Guest user creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create guest account'
    });
  }
};

/**
 * Convert guest to registered user
 * POST /api/auth/guest/convert
 * Requires: Authentication (guest user token)
 */
export const convertGuestToRegistered = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // req.user comes from auth middleware (we'll create next)
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if user is actually a guest
    if (!user.isGuest) {
      return res.status(400).json({
        success: false,
        message: 'User is already registered'
      });
    }
    
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use'
      });
    }
    
    // Convert guest to registered user
    user.email = email;
    user.password = password; // Will be hashed by pre-save hook
    user.name = name || user.name;
    user.authType = 'email';
    user.isGuest = false;
    user.guestExpiresAt = null;
    
    await user.save();
    
    // Generate new token (optional, but good practice)
    const token = generateToken(user._id);
    
    res.json({
      success: true,
      message: 'Account upgraded successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          isGuest: user.isGuest
        },
        token
      }
    });
    
  } catch (error) {
    console.error('Guest conversion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upgrade account'
    });
  }
};