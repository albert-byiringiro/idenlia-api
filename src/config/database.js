import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        const options = {
            maxPoolSize: 10,

            // timeout settings
            serverSelectionTimeoutMS:5000,
            socketTimeoutMS: 45000,
        };

        const conn = await mongoose.connect(process.env.MONGODB_URI, options)

        console.log(`MongoDB connected: ${conn.connection.host}`);

        // Handle connection events

        mongoose.connection.on('error', (err) => {
            console.error(`MongoDB connection error: ${err}`);
        })

        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected');
        })

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('MongoDB connection closed through app termination');
            process.exit(0);
        });

    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
}