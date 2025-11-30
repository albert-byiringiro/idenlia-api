/**
 * Passport Configuration
 * 
 * LAZY LOADING PATTERN:
 * - Export a configure() function instead of running code on import
 * - This allows us to call configure() AFTER env vars are loaded
 * - Strategies are registered only when configure() is explicitly called
 * 
 * Learning Resources:
 * - OAuth 2.0: https://oauth.net/2/
 * - Passport.js: http://www.passportjs.org/
 * - Google OAuth: https://developers.google.com/identity/protocols/oauth2
 */

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/User.js';

/**
 * Flag to track if passport has been configured
 * Prevents double-configuration
 */
let isConfigured = false;

/**
 * Configure Passport Strategies
 * 
 * MUST be called AFTER environment variables are loaded.
 * Call this from server.js after dotenv.config()
 * 
 * @returns {Object} - Configured passport instance
 */
export const configurePassport = () => {
  // Prevent double configuration
  if (isConfigured) {
    console.log('ℹ️ Passport already configured, skipping...\n');
    return passport;
  }
  
  console.log('\n📋 Configuring Passport Strategies...');
  console.log('GOOGLE_CLIENT_ID available?', !!process.env.GOOGLE_CLIENT_ID);
  console.log('GOOGLE_CLIENT_SECRET available?', !!process.env.GOOGLE_CLIENT_SECRET);
  
  /**
   * Validate Required Environment Variables
   */
  const requiredEnvVars = {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL
  };
  
  const missingVars = Object.entries(requiredEnvVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables for Google OAuth:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease check your .env file and ensure these variables are set.\n');
    console.warn('⚠️ Skipping Google OAuth configuration\n');
  } else {
    console.log('✅ All Google OAuth environment variables present');
    
    /**
     * ========================================
     * Google OAuth 2.0 Strategy
     * ========================================
     */
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: process.env.GOOGLE_CALLBACK_URL,
          scope: ['profile', 'email'],
          passReqToCallback: false
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            console.log('📥 Google Profile Received:', {
              id: profile.id,
              email: profile.emails?.[0]?.value,
              name: profile.displayName
            });
            
            const email = profile.emails?.[0]?.value;
            const name = profile.displayName;
            const avatar = profile.photos?.[0]?.value;
            
            if (!email) {
              return done(new Error('No email provided by Google'), null);
            }
            
            // Find existing Google user
            let user = await User.findOne({ 
              authType: 'google',
              email: email 
            });
            
            if (user) {
              console.log('✅ Existing Google user found:', user.email);
              user.lastLogin = new Date();
              
              if (avatar && avatar !== user.avatar) {
                user.avatar = avatar;
              }
              
              await user.save({ validateBeforeSave: false });
              return done(null, user);
            }
            
            // Check for email conflicts
            const existingEmailUser = await User.findOne({ email });
            
            if (existingEmailUser) {
              console.log('⚠️ Email already registered with different method');
              return done(
                new Error(
                  `Email already registered with ${existingEmailUser.authType} login. ` +
                  `Please use ${existingEmailUser.authType} to sign in.`
                ),
                null
              );
            }
            
            // Create new user
            console.log('🆕 Creating new Google user');
            user = new User({
              email,
              name,
              avatar,
              authType: 'google',
              isEmailVerified: true,
              isActive: true,
              lastLogin: new Date()
            });
            
            await user.save();
            
            console.log('✅ New Google user created:', user.email);
            return done(null, user);
            
          } catch (error) {
            console.error('❌ Google OAuth Error:', error);
            return done(error, null);
          }
        }
      )
    );
    
    console.log('✅ Google OAuth strategy configured');
  }
  
  /**
   * Passport Serialization
   * Required by Passport (even though we use JWT)
   */
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });
  
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
  
  isConfigured = true;
  console.log('✅ Passport configuration complete\n');
  
  return passport;
};

// Export the unconfigured passport instance
export default passport;