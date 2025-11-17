// In your app.js (update it)
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes.js'; // Add this

const app = express();

const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    optionsSuccessStatus: 200,
}

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Add authentication routes
app.use('/api/auth', authRoutes); // Add this line

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