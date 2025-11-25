import express from 'express';
import {
  register,
  login,
  logout,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  refreshToken,
  getCurrentUser,
  createGuestUser,
  convertGuestToRegistered
} from '../controllers/authController.js';
import { protect, requireVerification, restrictToRegistered } from '../middleware/auth.js';
import {
  validateRegistration,
  validateLogin,
  validateEmail,
  validatePasswordReset,
  validateToken,
  validateRefreshToken
} from '../middleware/validators.js';

const router = express.Router();

// Public routes
router.post('/register', validateRegistration, register);
router.post('/login', validateLogin, login);
router.post('/verify-email', validateToken, verifyEmail);
router.post('/resend-verification', validateEmail, resendVerification);
router.post('/forgot-password', validateEmail, forgotPassword);
router.post('/reset-password', validatePasswordReset, resetPassword);
router.post('/refresh', validateRefreshToken, refreshToken);

// Guest routes
router.post('/guest', createGuestUser);
router.post('/guest/convert', protect, validateRegistration, convertGuestToRegistered);

// Protected routes
router.post('/logout', protect, logout);
router.get('/me', protect, getCurrentUser);

// Example: Route that requires email verification
// router.get('/premium-feature', protect, requireVerification, (req, res) => {
//   res.json({ success: true, message: 'Access granted to premium feature' });
// });

// Example: Route that restricts guests
// router.post('/create-habit', protect, restrictToRegistered, (req, res) => {
//   res.json({ success: true, message: 'Habit created' });
// });

export default router;