import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/UserRoute.js";
import pfaRoutes from "./routes/pfaRoute.js";
import matiereRoute from "./routes/matiereRoute.js";
import competenceRoute from "./routes/competenceRoute.js";
import { seedDatabase } from "./config/seed.js";
import stageRoutes from "./routes/stageEteRoute.js";
import academicYearRoutes from "./routes/yearRoutes.js";
import "./template/cronjobs.js";

import { authMiddleware } from "./middellwares/authMiddellware.js";
//begin swagger
import swaggerUi from "swagger-ui-express";
import { readFile } from "fs/promises";

const app = express();

// Config
dotenv.config();

//begin swagger
const json = JSON.parse(
  await readFile(new URL("./swagger-output.json", import.meta.url))
);
app.use("/api/doc", swaggerUi.serve, swaggerUi.setup(json));

// Middleware setup
app.use(cors()); // Enable CORS middleware
app.use(express.json()); // Enable middleware for parsing JSON

// Routes

app.use("/", userRoutes);
app.use("/pfa", authMiddleware, pfaRoutes);
app.use("/internship", stageRoutes);
app.use("/Competences", competenceRoute);
app.use("/matieres", matiereRoute);

app.use('/api/academic-year', academicYearRoutes); // Prefix!
// Function to connect database, seed, and start the server
const startServer = async () => {
  try {
    const databaseUri =
      process.env.NODE_ENV === "production"
        ? process.env.PROD_DATABASE
        : process.env.DEV_DATABASE;

    // Database connection
    await mongoose.connect(databaseUri, {
      dbName: "Engineers",
    });
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
