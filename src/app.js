import express from 'express'
import cors from 'cors'

const app = express();

const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    optionsSuccessStatus: 200,
}

app.use(cors(corsOptions))