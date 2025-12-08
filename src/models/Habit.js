import mongoose from "mongoose";

const habitSchema = new mongoose.Schema({
    identity: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Identity',
        required: true,
    },
    action: {
        type: String,
        sparse: true,
        trim: true,
        minlength: [3, 'Action must be at least 3 characters long'],
        maxlength: [100, 'Action cannot exceed 100 characters'],
        required: [true, 'Habit Action is required'],
    },
    timePlace: {
        type: String,
        trim: true,
        required: [true, 'Time or Place of action is required'],
        minlength: [5, 'Time or Place must be at least 5 characters long'],
        maxlength: [150, 'Time or Place cannot exceed 150 characters'],
    },
    frequency: {
        type: [Number],
        required: [true, 'Choose at least 1 day of occurence'],
        validate: [
            {
                validator: function (v) {
                    return v && v.length > 0;
                },
                message: 'Frequency must contain at least one day of occurence.',
            },
            {
                validator: (v) => v.every(day => day >= 1 && day <= 7),
                message: 'Frequency days must be between 1 (Monday) and 7 (Sunday).',
            }
        ]
    },
    timeOfDay: {
        type: Date,
        required: [true, 'Time of day is required'],
    },
    isActive: {
        type: Boolean,
        default: false,
    },
    snoozeUntil: {
        type: Date,
    }, 
    inHallOfFame: {
        type: Boolean,
        default: false,
    },
    currentStreak: {
        type: Number,
    },
    longestStreak: {
        type: Number,
    },
}, {
    timestamps: true,
})

export const Habit = mongoose.model('Habit', habitSchema)