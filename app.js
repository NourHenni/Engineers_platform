import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/UserRoute.js";
const app = express(); // Création de l'application Express

// config
dotenv.config();

// DATABASE CONNECTION
const databaseUri =
  process.env.NODE_ENV === "production"
    ? process.env.PROD_DATABASE
    : process.env.DEV_DATABASE;

mongoose
  .connect(databaseUri, {
    dbName: "Engineers",
  })
  .then(() => {
    console.log("Connected to the database");
  })
  .catch((err) => {
    console.error("Database connection error:", err);
  });

app.use(cors()); // Activer le middleware CORS pour permettre les requêtes cross-origin
app.use(express.json()); // Activer le middleware pour parser le JSON dans les requêtes HTTP

app.use("/api", userRoutes);

export default app;
