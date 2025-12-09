import { Identity } from '../models/Identity.js'
import { Habit } from '../models/Habit.js'
import { getHabitsForDate } from '../services/habitsService.js';
import { toISODate } from '../utils/dateUtils.js';
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

/**
 * Update an existing habit, managing identity usage counts correctly.
 * PATCH /api/habit/:id
 */
export const updateHabit = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { identityName, ...habitData } = req.body;
        let identityIdToSet;

        const originalHabit = await Habit.findById(id).select('identity');
        if (!originalHabit) {
            return res.status(404).json({
                status: 'fail',
                message: 'No habit found with that ID',
            });
        }

        const oldIdentityId = originalHabit.identity;

        if (identityName) {
            const newIdentity = await Identity.findOneAndUpdate(
                { name: identityName },
                { $inc: { usageCount: 1 } },
                { new: true, upsert: true, runValidators: true }
            );
            identityIdToSet = newIdentity._id;

            if (oldIdentityId && !oldIdentityId.equals(identityIdToSet)) {
                await Identity.findByIdAndUpdate(
                    oldIdentityId,
                    { $inc: { usageCount: -1 }},
                    { new: true }
                );
            }
        } else {
            identityIdToSet = oldIdentityId;
        }

        const updateHabit = await Habit.findByIdAndUpdate(
            id,
            {
                ...habitData,
                identity: identityIdToSet,
            },
            { new: true, runValidators: true }
        );

        const habitWithIdentity = await Habit.findById(updateHabit._id).populate('identity', 'name usageCount').exec();

        res.status(200).json({
            status: 'success',
            data: {
                habit: habitWithIdentity
            }
        });

    } catch (error) {
        res.status(400).json({
            status: 'fail',
            message: error.message,
        })
    }
}

/**
 * Get all habits
 * GET /api/habit
 */
export const getAllHabits = async (req, res, next) => {
    try {
        const habits = await Habit.find({})
                                  .populate('identity', 'name usageCount')
                                  .exec();

        res.status(200).json({
            status: 'success',
            results: habits.length,
            data: {
                habits
            }
        });
    } catch (error) {
        res.status(400).json({
            status: 'fail',
            message: error.message,
        });
    }
};

/**
 * Get a single habit by ID
 * GET /api/habit/:id
 */ 
export const getHabit = async (req, res, next) => {
    try {
        const { id } = req.params;

        const habit = await Habit.findById(id).populate('identity', 'name usageCount').exec();

        if (!habit) {
            res.status(404).json({
                status: 'fail',
                message: 'No habit found with that ID',
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                habit
            }
        })
    } catch (error) {
        res.status(400).json({
            status: 'fail',
            message: error.message,
        })
    }
}

/**
 * Delete a habit by ID and decrement the associated identity's usage count
 * DELETE /api/habit/:id
 */
export const deleteHabit = async (req, res, next) => {
    try {
        const { id } = req.params;

        const habitToDelete = await Habit.findById(id).select('identity');

        if (!habitToDelete) {
            return res.status(404).json({
                status: 'fail',
                message: 'No habit found with that ID',
            });
        }

        const identityId = habitToDelete.identity;

        await Habit.findByIdAndDelete(id);

        if (identityId) {
            await Identity.findByIdAndUpdate(
                identityId,
                { $inc: { usageCount: -1 } }
            );
        }

        res.status(204).json({
            status: 'success',
            data: null,
        });
    } catch (error) {
        res.status(400).json({
            status: 'fail',
            message: error.message,
        });
    }
};

/**
 * Get all habits
 * GET /api/habit
 */
export const getHabitsFortheDay = async (req, res, next) => {
    try {
        const isoDate = toISODate(req.params.date)

        const habits = await Habit.find({})
                                  .populate('identity', 'name usageCount')
                                  .exec();

        const filteredHabits = getHabitsForDate(habits, isoDate)

        res.status(200).json({
            status: 'success',
            date: isoDate,
            results: filteredHabits.length,
            data: {
                filteredHabits
            }
        });
    } catch (error) {
        res.status(400).json({
            status: 'fail',
            message: error.message,
        });
    }
};
