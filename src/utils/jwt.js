import jwt from 'jsonwebtoken';
import crypto from 'crypto';

/**
 * JWT Utility 
 */ 
class JWTService {
    constructor() {
        this.accessTokenSecret = process.env.JWT_SECRET;
        this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET;
        this.accessTokenExpiry = process.env.JWT_EXPIRES_IN || "15m";
        this.refreshTokenSecret = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    }

    /**
     * Generate Access Token (short-lived)
     */
    generateAccessToken(userId, email, authType = 'email') {
        return jwt.sign(
            {
                userId,
                email,
                authType,
                type: 'access',
            },
            this.accessTokenSecret,
            { expiresIn: this.accessTokenExpiry }
        );
    }

    /**
     * Generate Refresh Token (long-lived)
     */ 
    generateRefreshToken(userId) {
        const payload = {
            userId,
            type: 'refresh',
            jti: crypto.randomBytes(16).toString('hex')
        };

        return jwt.sign(payload, this.refreshTokenSecret, {
            expiresIn: this.refreshTokenSecret
        })
    }

    /**
     * Generate both tokens
     */ 
    generateTokenPair(userId, email, authType) {
        return {
            accessToken: this.generateAccessToken(userId, email, authType),
            refreshToken: this.generateRefreshToken(userId)
        };
    }

    /**
     * Verify Access Token
     */ 
    verifyAccessToken(token) {
        try {
            const decoded = jwt.verify(token, this.accessTokenSecret);

            if (decoded.type !== 'access') {
                throw new Error('Invalid token type');
            }

            return decoded;
        } catch (error) {
            throw new Error('Invalid or expired access token')
        }
    }

    /**
     * Verify Access Token
     */ 
    verifyRefreshToken(token) {
        try {
            const decoded = jwt.verify(token, this.refreshTokenSecret);

            if (decoded.type !== 'refresh') {
                throw new Error('Invalid token type');
            }

            return decoded;
        } catch (error) {
            throw new Error('Invalid or expired refresh token')
        }
    }

    /**
     * Decode token without verification (for inspection)
     */
    decodeToken(token) {
        return jwt.decode(token);
    }
}

// Export singleton instance
export const jwtService = new JWTService()