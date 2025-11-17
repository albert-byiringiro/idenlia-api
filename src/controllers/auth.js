import User from './../models/index.js'
import jwt from 'jsonwebtoken'

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
        const guestUser = new User()
        guestUser.setAsGuestUser();

        await guestUser.save();

        const token = generateToken(guestUser._id);

        return res.status(201).json({
            success: true,
            message: 'Guest account created',
            data: {
                user: {
                    id: guestUser._id,
                    name: guestUser.name,
                    isGuest: guestUser.isGuest,
                    expiresAt: guestUser.guestExpiresAt,
                },
                token,
            }
        });

    } catch (error) {
        console.error('Guest user creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create guest account'
        })
    }
}