/**
 * Express Application Setup
 * 
 * Configures middleware and routes.
 */

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes.js';
import habitRoutes from './routes/habitRoutes.js';

const app = express();

/**
 * CORS Configuration
 * 
 * Allows frontend to communicate with backend.
 * credentials: true - allows cookies and authorization headers
 */
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    optionsSuccessStatus: 200,
}

app.use(cors(corsOptions));

/**
 * Body Parser Middleware
 * 
 * Parses incoming JSON and URL-encoded data
 * Limit prevents huge payloads from overwhelming server
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * HTTP Request Logging
 * 
 * Morgan logs all HTTP requests
 * - 'dev' format: colored, concise (for development)
 * - 'combined' format: detailed, Apache-style (for production)
 */
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

/**
 * Routes
 * 
 * Mount route modules
 * All auth routes will be under /api/auth
 */
app.use('/api/auth', authRoutes);

app.use('/api/habit', habitRoutes)

/**
 * Health Check / API Info Endpoint
 * 
 * GET / - Returns API information      
 * Useful for:
 * - Verifying server is running
 * - Discovering available endpoints
 * - Health checks in deployment pipelines
 */
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Welcome to Idenlia API',
        version: '1.0.0',
        documentation: '/api/docs',
        endpoints: {
            auth: '/api/auth',
            habits: '/api/habits',
            identities: '/api/identities',
            completions: '/api/completions',
            settings: '/api/settings'
        }
    });
});

export default app;