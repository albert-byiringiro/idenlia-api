import express from 'express'
import { createGuestUser } from '../controllers/index.js'
import { protect } from '../middleware/auth.js'


const router = express.Router();

router.post('/guest', createGuestUser);

export default router;