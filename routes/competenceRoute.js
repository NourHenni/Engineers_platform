import express, { Router } from "express";
import { authMiddleware } from "../middellwares/authMiddellware.js";
import { isAdmin, isEnseignant } from "../middellwares/roleMiddellware.js";

const router = express.Router();
//const competenceController = require("../controllers/competenceController.js");
import {
  createCompetence,
  getCompetences,
  getCompetenceById,
} from "../controllers/competenceController.js";

// Routes CRUD
router.post("/competences", createCompetence);
router.get(
  "/competences",
  authMiddleware,
  isAdmin,
  isEnseignant,
  getCompetences
);
router.get(
  "/competences/:id",

  getCompetenceById
);

export default router;
