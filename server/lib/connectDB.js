import mongoose from "mongoose";
import { ENV } from "./ENV.js";

export const connectDB = async () => {
  if (!ENV.DB_URL) {
    throw new Error("Missing DB_URL environment variable. Check your .env file.");
  }

  try {
    await mongoose.connect(ENV.DB_URL);
    console.log("DB is now connected");
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error.message || error);
    throw error;
  }
};
