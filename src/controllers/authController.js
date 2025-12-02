import { User } from '../models/User.js';
import { jwtService } from '../utils/jwt.js';
import { emailService } from '../services/emailService.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import passport from '../config/passport.js';

/**
 * Create a guest user account
 * POST /api/auth/guest
 */
export const createGuestUser = async (req, res) => {
  try {
    const guestUser = new User();
    guestUser.setAsGuest();
    await guestUser.save();
    
    const tokens = jwtService.generateTokenPair(
      guestUser._id,
      null,
      'guest'
    );
    
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
        tokens
      }
    });
  } catch (error) {
    console.error('Guest creation error:', error);
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
    
    const user = await User.findById(req.user.userId);
    
    if (!user || !user.isGuest) {
      return res.status(400).json({
        success: false,
        message: 'Invalid operation'
      });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use'
      });
    }
    
    user.email = email;
    user.password = password;
    user.name = name || user.name;
    user.authType = 'email';
    user.isGuest = false;
    user.guestExpiresAt = null;
    
    const verificationToken = user.createEmailVerificationToken();
    await user.save();
    
    await emailService.sendVerificationEmail(user, verificationToken);
    
    const tokens = jwtService.generateTokenPair(
      user._id,
      user.email,
      user.authType
    );
    
    res.json({
      success: true,
      message: 'Account upgraded successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          isEmailVerified: user.isEmailVerified
        },
        tokens
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

/**
 * REGISTRATION
 * POST /api/auth/register
 */
export const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registred'
      })
    }

    const user = new User({
      email,
      password,
      name,
      authType: 'email',
      isEmailVerified: false
    })

    // Generate email verification token
    const verificationToken = user.createEmailVerificationToken();
    await user.save();

    // send verification email
    await emailService.sendVerificationEmail(user, verificationToken);

    const tokens = jwtService.generateTokenPair(user._id, user.email, user.authType);

    // save refresh token to database
    user.refreshToken = tokens.refreshToken;
    await user.save({ validateBeforeSave: false })

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          isEmailVerified: user.isEmailVerified,
          authType: user.authType
        },
        tokens
      }
    })
  } catch (error) {
    console.error('Registration error:', error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message)
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      })
    }

    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    })
  }
}

/**
 * LOGIN
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user and verify credentials
    const user = await User.findByCredentials(email, password);

    user.lastLogin = new Date();

    // Generate tokens
    const tokens = jwtService.generateTokenPair(user._id, user.email, user.authType);

    user.refreshToken = tokens.refreshToken;
    await user.save({ validateBeforeSave: false })

    res.json({
      session: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          isEmailVerified: user.isEmailVerified,
          authType: user.authType
        },
        tokens
      }
    });
  } catch (error) {
    console.error('Login error', error);

    res.status(401).json({
      success: false,
      message: error.message || 'Login failed'
    });
  }
}

/**
 * VERIFY EMAIL
 * POST /api/auth/verify-email
 */
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    // Hash the token from URL to compare with database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token',
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    // send welcome email
    await emailService.sendWelcomeEmail(user);

    res.json({
      success: true,
      message: 'Email verified successfully',
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Email verification failed',
    })
  }
}

/**
 * RESEND VERIFICATION EMAIL
 * POST /api/auth/resend-verification
 */
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body

    const user = await User.findOne({ email, authType: 'email' });

    if (!user) {
      return res.status(404).json({
        success: true,
        message: 'User not found',
      })
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      })
    }

    const verificationToken = user.createEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    await emailService.sendVerificationEmail(user, verificationToken)

    res.json({
      success: true,
      message: 'Verification email sent',
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification email',
    })
  }
}

/**
 * FORGOT PASSWORD
 * POST /api/auth/forgot-password
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email, authType: 'email' });

    if (!user) {
      res.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.'
      })
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    await emailService.sendPasswordResetEmail(user, resetToken)

    res.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link'
    })

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request'
    })
  }
}

/**
 * RESET PASSWORD
 * POST /api/auth/reset-password
 */
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    // Hash token to compare with database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    }).select('+resetPasswordToken +resetPasswordExpires');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      })
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.passwordChangeAt = Date.now();
    user.refreshToken = undefined;
    
    const tokens = jwtService.generateTokenPair(user._id, user.email, user.authType);
    
    user.refreshToken = tokens.refreshToken;
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Password reset successful',
      data: { tokens }
    });
  } catch (error) {
    console.error('Reset password error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Password validation failed',
      })
    }

    res.status(500).json({
      success: false,
      message: 'Password reset failed'
    })
  }
}

/**
 * REFRESH TOKEN
 * POST /api/auth/refresh
 */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }
    
    // 1. Verify token signature
    const decoded = jwtService.verifyRefreshToken(refreshToken);
    
    // 2. Find user and check if token matches
    const user = await User.findById(decoded.userId).select('+refreshToken');
    
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }
    
    // 3. Generate NEW tokens
    const tokens = jwtService.generateTokenPair(user._id, user.email, user.authType);
    
    // 4. Replace old refresh token with new one
    user.refreshToken = tokens.refreshToken;
    await user.save({ validateBeforeSave: false });
    
    res.json({
      success: true,
      data: { tokens }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: 'Token refresh failed'
    });
  }
}

/**
 * LOGOUT
 * POST /api/auth/logout
 */
export const logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.userId, {
      $unset: { refreshToken: 1 }
    });

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: true,
      message: 'Logout failed',
    })
  }
}

/**
 * GET CURRENT USER
 * GET /api/auth/me
 */
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          isEmailVerified: user.isEmailVerified,
          authType: user.authType,
          isGuest: user.isGuest,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch user data',
    })
  }
}

/**
 * ============================================
 * GOOGLE OAUTH FUNCTIONS
 * ============================================
 */

/**
 * Initiate Google OAuth Flow
 * GET /api/auth/google
 */
export const googleAuth = passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false
});

/**
 * Handle Google OAuth Callback
 * GET /api/auth/google/callback
 */
export const googleCallback = (req, res, next) => {
  passport.authenticate('google', { session: false }, async (err, user, info) => {
    try {
      if (err) {
        console.error('❌ Google OAuth error:', err);
        const errorMessage = encodeURIComponent(err.message || 'Authentication failed');
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=${errorMessage}`);
      }
      
      if (!user) {
        console.error('❌ Google OAuth: No user returned');
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=authentication_failed`);
      }
      
      const tokens = jwtService.generateTokenPair(user._id, user.email, user.authType);
      
      user.refreshToken = tokens.refreshToken;
      await user.save({ validateBeforeSave: false });
      
      console.log('✅ Google OAuth successful for:', user.email);
      
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?` +
        `accessToken=${tokens.accessToken}&` +
        `refreshToken=${tokens.refreshToken}&` +
        `authType=google`;
      
      res.redirect(redirectUrl);
      
    } catch (error) {
      console.error('❌ Error in Google callback:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
    }
  })(req, res, next);
};


/**
 * ============================================
 * GITHUB OAUTH FUNCTIONS
 * ============================================
 */

/**
 * Initiate GitHub OAuth Flow
 * 
 * GET /api/auth/github
 * 
 * How it works (same as Google):
 * 1. User clicks "Sign in with GitHub"
 * 2. This endpoint redirects to GitHub login
 * 3. User authorizes on GitHub
 * 4. GitHub redirects back to our callback
 */
export const githubAuth = passport.authenticate('github', {
  scope: ['user:email'], // Request email access
  session: false
});

/**
 * Handle GitHub OAuth Callback
 * 
 * GET /api/auth/github/callback
 * 
 * Same flow as Google, just different provider
 * 
 * @param {Request} req
 * @param {Response} res
 * @param {Function} next
 */
export const githubCallback = (req, res, next) => {
  passport.authenticate('github', { session: false }, async (err, user, info) => {
    try {
      // ========================================
      // Handle Authentication Errors
      // ========================================
      if (err) {
        console.error('❌ GitHub OAuth error:', err);
        const errorMessage = encodeURIComponent(err.message || 'Authentication failed');
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=${errorMessage}`);
      }
      
      // ========================================
      // Handle Case Where No User Returned
      // ========================================
      if (!user) {
        console.error('❌ GitHub OAuth: No user returned');
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=authentication_failed`);
      }
      
      // ========================================
      // Generate JWT Tokens
      // ========================================
      const tokens = jwtService.generateTokenPair(user._id, user.email, user.authType);
      
      // ========================================
      // Save Refresh Token to Database
      // ========================================
      user.refreshToken = tokens.refreshToken;
      await user.save({ validateBeforeSave: false });
      
      console.log('✅ GitHub OAuth successful for:', user.email);
      
      // ========================================
      // Redirect to Frontend with Tokens
      // ========================================
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?` +
        `accessToken=${tokens.accessToken}&` +
        `refreshToken=${tokens.refreshToken}&` +
        `authType=github`;
      
      res.redirect(redirectUrl);
      
    } catch (error) {
      console.error('❌ Error in GitHub callback:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
    }
  })(req, res, next);
};