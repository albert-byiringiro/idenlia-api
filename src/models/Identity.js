import mongoose from "mongoose";

const identitySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Identity name is required'],
        unique: true,
    },
    usageCount: {
        type: Number,
    },
}, {
    timestamps: true,
})

export const Identity = mongoose.model('Identity', identitySchema)