import express from 'express';
import { createHabit } from '../controllers/habitController.js'; 

const router = express.Router();

router.post('/create-habit', createHabit); // Added missing leading slash

export default router;