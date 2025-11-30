/**
 * Passport Configuration
 * 
 * IMPORTANT: This file loads AFTER dotenv.config() in server.js
 * Environment variables should be available here
 */

// Debug: Check environment variables
console.log('\n📋 Passport Config Loading...');
console.log('GOOGLE_CLIENT_ID available?', !!process.env.GOOGLE_CLIENT_ID);
console.log('GOOGLE_CLIENT_SECRET available?', !!process.env.GOOGLE_CLIENT_SECRET);

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/User.js';

// Validate required environment variables
const requiredEnvVars = {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL
};

// Check if any required vars are missing
const missingVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables for Google OAuth:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\nPlease check your .env file and ensure these variables are set.\n');
  
  // Don't crash, just skip Google OAuth setup
  console.warn('⚠️ Skipping Google OAuth configuration\n');
} else {
  console.log('✅ All Google OAuth environment variables present');
  
  // Configure Google Strategy
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
          
          // Try to find existing user
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
          
          // Check if email exists with different auth type
          const existingEmailUser = await User.findOne({ email });
          
          if (existingEmailUser) {
            console.log('⚠️ Email already registered with different method');
            return done(
              new Error(`Email already registered with ${existingEmailUser.authType} login. Please use ${existingEmailUser.authType} to sign in.`),
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
  
  console.log('✅ Google OAuth strategy configured\n');
}

// Serialize/Deserialize (required by Passport)
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

export default passport;