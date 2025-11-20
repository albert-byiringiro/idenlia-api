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
        minlength: [8, 'Password must be at least 8 characters.'],
        select: false,
        validate: {
            validator: function(v) {
                if (!v) return true;
                return /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/.test(v);
            },
            message: 'Password must contain at least one number, one lowercase and one uppercase letter'
        }
    },

    authType: {
        type: String,
        enum: ['guest', 'email', 'google', 'github'],
        required: true,
        default: 'guest'
    },

    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        minlength: [50, 'Name cannot exceed 50 characters'],
    },

    avatar: {
        type: String,
        default: null,
    },
    
    // Account status
    isActive: {
        type: Boolean,
        default: true,
    },

    isEmailVerified: {
        type: Boolean,
        default: false,
    },

    // Guest Management
    isGuest: {
        type: Boolean,
        default: false
    },

    guestExpiresAt: {
        type: Date,
        default: null
    },

    // Email verification
    emailVerificationToken: {
        type: String,
        select: false,
    },

    emailVerificationExpires: {
        type: Date,
        select: false,
    },

    // Password reset
    resetPasswordToken: {
        type: String,
        select: false,
    },

    resetPasswordExpires: {
        type: Date,
        select: false,
    },

    // Refresh token for JWT rotation
    refreshToken: {
        type: String,
        select: false,
    },

    // Security
    lastLogin: {
        type: Date,
        default: Date.now()
    },

    loginAttempts: {
        type: Number,
        default: 0,
    },

    lockUntil: {
        type: Date,
    },

    passwordChangeAt: {
        type: Date,
    },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function(_doc, ret) {
            delete ret.password;
            delete ret.refreshToken;
            delete ret.emailVerificationToken;
            delete ret.resetPasswordToken;
            return ret;
        }
    },
    toObject: { virtuals: true }
});

// Indexes
userSchema.index({ guestExpiresAt: 1 });
userSchema.index({ email: 1 });
userSchema.index({ resetPasswordToken: 1 });
userSchema.index({ emailVerificationToken: 1 });

// Virtual for account locked status
userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
})

// Pre-save middleware - hash password
userSchema.pre('save', async function (next) {
    // Only hash if password is modified
    if (!this.isModified('password')) return next();

    if (!this.password) return next();

    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);

        // Set password changed timestamp
        if (!this.isNew) {
            this.passwordChangeAt = Date.now() - 1000;
        }

        next()
    } catch (error) {
        next(error)
    }
});

/**
 * INSTANCE METHODS 
 */ 

userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password)
}

// Check if password has changed after JWT has been issued
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangeAt) {
        const changedTimestamp = parseInt(this.passwordChangeAt.getTime() / 1000, 10);
        return JWTTimestamp < changedTimestamp;
    }

    return false;
}

// Generate email verification token
userSchema.methods.createEmailVerificationToken = function () {
    // Generate random token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // hash token and save to database
    this.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex')

    // set expiration (24 hours)
    this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;

    // Return unhashed token (send this via email)
    return verificationToken;
}

userSchema.methods.createPasswordResetToken = function () {
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex')

    this.resetPasswordExpires = Date.now() + 60 * 60 * 1000;

    return resetToken;
}

// Increment login attempts
userSchema.methods.incLoginAttempts = async function () {
    // reset attemps if lock has expired
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return await this.updateOne({
            $set: { loginAttempts: 1 },
            $unset: { lockUntil: 1 },
        })
    }

    const updates = { $inc: { loginAttempts: 1 } };

    // Lock account for 2 hours after 5 failed attempts
    const maxAttempts = 5;
    const lockTime = 2 * 60 * 60 * 1000;

    if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + lockTime }
    }

    return await this.updateOne(updates)

}

// Reset login attempts
userSchema.methods.resetLoginAttempts = async function () {
    return await this.updateOne({
        $set: { loginAttempts: 0 },
        $unset: { lockUntil: 1 }
    });
}

// Set as guest
userSchema.methods.setAsGuest = function () {
    this.isGuest = true;
    this.authType = 'guest';

    this.guestExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

/**
 * STATIC METHODS 
 */ 

// Find user by credentials (email/password)
userSchema.statics.findByCredentials = async function (email, password) {
    const user = await this.findOne({ email, authType: 'email' }).select('+password +loginAttempts +lockUntil');

    if (!user) {
        throw new Error('Invalid email or password');
    }

    if (user.isLocked) {
        throw new Error('Account is locked due to too many fialed login attempts. Please Please try again later.')
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
        await user.incLoginAttempts();
        throw new Error('Invalid email or password');
    }

    if (user.loginAttempts > 0) {
        await user.resetLoginAttempts();
    }

    return user;
}

export const User = mongoose.model('User', userSchema)