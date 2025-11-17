import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        sparse: true,
        lowercase: true,
        trim: true,
        validate: {
        validator: function(v) {
            if (!v) return true;
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Invalid email format'
        }
    },

    password: {
        type: String,
        minlength: 8,
        select: false
    },

    // Guest-specific fields
    authType: {
        type: String,
        enum: ['guest', 'email', 'google', 'github'],
        required: true,
        default: 'guest'
    },

    isGuest: {
        type: Boolean,
        default: false
    },

    guestExpiresAt: {
        type: Date,
        default: null
    },

    // Profile data
    name: {
        type: String,
        trim: true,
        default: function() {
            return this.authType === 'guest' ? 'Guest User' : '';
        }
    },
    
    lastLogin: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

userSchema.index({ guestExpiresAt: 1 });

userSchema.methods.setAsGuest = function () {
    this.isGuest = true;
    this.authType = 'guest';

    this.guestExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

export const User = mongoose.model('User', userSchema)