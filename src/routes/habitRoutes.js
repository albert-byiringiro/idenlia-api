import express from 'express';
import { 
    createHabit, 
    getAllHabits, 
    getHabit, 
    updateHabit,
    deleteHabit, 
    getHabitsFortheDay
} from '../controllers/habitController.js'; 

const router = express.Router();

router.post('/create-habit', createHabit);
router.get('/all-habits', getAllHabits);

router.route('/:id')
.get(getHabit)      
.patch(updateHabit) 
.delete(deleteHabit);

router.route('/date/:date').get(getHabitsFortheDay);

export default router;
