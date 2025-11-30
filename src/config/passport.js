/**
 * Passport configuration
 */ 

import passport from "passport";
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { User } from "../models/User.js";

/**
 * Google OAuth Strategy
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
        /**
         * Verify Callback
         * 
         * Called after Google successfully authenticates user
         */
        async (accessToken, refreshToken, profile, done) => {
            try {
                console.log('Google profile received', {
                    id: profile.id,
                    email: profile.emails?.[0]?.value,
                    name: profile.displayName
                });

                const googleId = profile.id;
                const email = profile.emails?.[0]?.value;
                const name = profile.displayName;
                const avatar = profile.photos?.[0]?.value;

                if (!email) {
                    return done(new Error('No email provided by Google'), null);
                }

                let user = await user.findOne({
                    authType: 'google',
                    email: email
                })

                if (user) {
                    // Existing Google user - just update last login
                    console.log('Existing Google user found:', user.email);
                    user.lastLogin = new Date();

                    if (avatar && avatar !== user.avatar) {
                        user.avatar = avatar;
                    }

                    await user.save({ validateBeforeSave: false });
                    return done(null, user)
                }

                const existingEmailUser = await user.findOne({ email });

                if (existingEmailUser) {
                    console.log('Email already registerd with different method');
                    return done(
                        new Error(`Email already registered with ${existingEmailUser}`),
                        null
                    );
                }
                
                console.log('🆕 Creating new Google user');

                user = new User({
                    email,
                    name,
                    avatar,
                    authType: 'google',
                    isEmailVerified: true,
                    isActive: true,
                    lastLogin: new Date()
                })

                await user.save();

                console.log('New Google user created:', user.email);
                return done(null, user);
            } catch (error) {
                console.error('Google OAuth Error:', error);
                return done(error, null)
            }
        }
    )
)