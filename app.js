import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/UserRoute.js";
import { seedDatabase } from "./config/seed.js";

const app = express(); // Create the Express application

// Config
dotenv.config();

// Middleware setup
app.use(cors()); // Enable CORS middleware
app.use(express.json()); // Enable middleware for parsing JSON

// Routes
app.use("/api", userRoutes);

// Function to connect database, seed, and start the server
const startServer = async () => {
  try {
    const databaseUri =
      process.env.NODE_ENV === "production"
        ? process.env.PROD_DATABASE
        : process.env.DEV_DATABASE;

    // Database connection
    await mongoose.connect(databaseUri, { dbName: "Engineers" });
    console.log("Connected to the database");

    // Database seeding
    await seedDatabase();
    console.log("Database seeding completed");
  } catch (error) {
    console.error("Error starting the application:", error);
    process.exit(1); // Exit with failure code
  }
};

// Start the server
startServer();

export default app;
