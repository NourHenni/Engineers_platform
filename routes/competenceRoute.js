import express, { Router } from "express";
import { authMiddleware } from "../middellwares/authMiddellware.js";
import { isAdmin, isEnseignant } from "../middellwares/roleMiddellware.js";

const router = express.Router();
//const competenceController = require("../controllers/competenceController.js");
import {
  createCompetence,
  getCompetences,
  getCompetenceById,
  updateCompetence,
  deleteCompetence,
} from "../controllers/competenceController.js";

// Routes CRUD
router.post("/competences", createCompetence);
router.get(
  "/competences",

  getCompetences
);
router.get(
  "/competences/:id",

  getCompetenceById
);
router.patch("/competences/:id", updateCompetence);
router.delete("/competences/:id", deleteCompetence);

export default router;
