import jwt from "jsonwebtoken";
import { User } from './../models/index.js'
export const protect = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization?.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1]
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized - No toekn provided'
            })
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.userID).select('-password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found',
            })
        }

        req.user = {
            userId: user._id,
            emal: user.email,
            isGuest: user.isGuest,
            authType: user.authType,
        };

        next();
    } catch (error) {
        console.error('Auth middleware error', error);

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token',
            })
        }

        res.status(500).json({
            success: false,
            message: 'Authentication failed'
        })
    }
}