import express from 'express'
import { createGuestUser } from '../controllers/authController.js'

const router = express.Router();

router.post('/guest', createGuestUser);

export default router;