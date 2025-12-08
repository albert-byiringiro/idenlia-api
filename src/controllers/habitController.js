import { Identity } from '../models/Identity.js'
import { Habit } from '../models/Habit.js'
/**
 * Create a new habit
 * POST /api/habit
 */
export const createHabit = async (req, res, next) => {
    try {
        const { identityName, ...habitData } = req.body;

        const identity = await Identity.findOneAndUpdate(
            {name: identityName},
            { $inc: { usageCount: 1 } },
            {new: true, upsert: true, runValidators: true }
        )

        const identityId = identity._id;

        const newHabit = await Habit.create({
            ...habitData,
            identity: identityId,
        });

        const habitWithIdentity = await Habit.findById(newHabit._id).populate('identity', 'name usageCount').exec();

        res.status(201).json({
            status: 'success',
            data: {
                habit: habitWithIdentity
            }
        })
    } catch (error) {
        res.status(400).json({
            status: 'fail',
            message: error.message,
        });
    }
}