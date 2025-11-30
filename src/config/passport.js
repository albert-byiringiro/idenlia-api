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
 * - GitHub OAuth: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps
 */

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
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
  
  // ========================================
  // GOOGLE OAUTH 2.0 STRATEGY
  // ========================================
  console.log('GOOGLE_CLIENT_ID available?', !!process.env.GOOGLE_CLIENT_ID);
  console.log('GOOGLE_CLIENT_SECRET available?', !!process.env.GOOGLE_CLIENT_SECRET);
  
  const googleEnvVars = {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL
  };
  
  const missingGoogleVars = Object.entries(googleEnvVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key);
  
  if (missingGoogleVars.length > 0) {
    console.error('❌ Missing Google OAuth environment variables:');
    missingGoogleVars.forEach(varName => console.error(`   - ${varName}`));
    console.warn('⚠️ Skipping Google OAuth configuration\n');
  } else {
    console.log('✅ Google OAuth environment variables present');
    
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
  
  // ========================================
  // GITHUB OAUTH 2.0 STRATEGY
  // ========================================
  console.log('GITHUB_CLIENT_ID available?', !!process.env.GITHUB_CLIENT_ID);
  console.log('GITHUB_CLIENT_SECRET available?', !!process.env.GITHUB_CLIENT_SECRET);
  
  const githubEnvVars = {
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    GITHUB_CALLBACK_URL: process.env.GITHUB_CALLBACK_URL
  };
  
  const missingGithubVars = Object.entries(githubEnvVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key);
  
  if (missingGithubVars.length > 0) {
    console.error('❌ Missing GitHub OAuth environment variables:');
    missingGithubVars.forEach(varName => console.error(`   - ${varName}`));
    console.warn('⚠️ Skipping GitHub OAuth configuration\n');
  } else {
    console.log('✅ GitHub OAuth environment variables present');
    
    /**
     * GitHub OAuth 2.0 Strategy
     * 
     * Key Differences from Google:
     * - Scope: 'user:email' instead of 'profile email'
     * - Profile structure: username, emails[], avatar_url
     * - Email might not be public (need to request separately)
     */
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL: process.env.GITHUB_CALLBACK_URL,
          scope: ['user:email'], // Request email access
          passReqToCallback: false
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            console.log('📥 GitHub Profile Received:', {
              id: profile.id,
              username: profile.username,
              emails: profile.emails
            });
            
            /**
             * GitHub Email Handling
             * 
             * GitHub returns an array of emails with:
             * - value: email address
             * - primary: boolean (is this the main email?)
             * - verified: boolean (is this email verified?)
             * 
             * We want the primary verified email
             */
            const primaryEmail = profile.emails?.find(email => email.primary && email.verified);
            const email = primaryEmail?.value || profile.emails?.[0]?.value;
            
            // Name handling: GitHub doesn't always provide displayName
            // Use profile.displayName OR username as fallback
            const name = profile.displayName || profile.username;
            const avatar = profile.photos?.[0]?.value || profile._json?.avatar_url;
            
            if (!email) {
              return done(
                new Error('No verified email provided by GitHub. Please verify your email on GitHub.'),
                null
              );
            }
            
            // Find existing GitHub user
            let user = await User.findOne({ 
              authType: 'github',
              email: email 
            });
            
            if (user) {
              console.log('✅ Existing GitHub user found:', user.email);
              user.lastLogin = new Date();
              
              // Update avatar if changed
              if (avatar && avatar !== user.avatar) {
                user.avatar = avatar;
              }
              
              await user.save({ validateBeforeSave: false });
              return done(null, user);
            }
            
            // Check for email conflicts with other auth types
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
            
            // Create new GitHub user
            console.log('🆕 Creating new GitHub user');
            user = new User({
              email,
              name,
              avatar,
              authType: 'github',
              isEmailVerified: true, // GitHub emails are verified
              isActive: true,
              lastLogin: new Date()
            });
            
            await user.save();
            
            console.log('✅ New GitHub user created:', user.email);
            return done(null, user);
            
          } catch (error) {
            console.error('❌ GitHub OAuth Error:', error);
            return done(error, null);
          }
        }
      )
    );
    
    console.log('✅ GitHub OAuth strategy configured');
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