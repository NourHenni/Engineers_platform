import express, { Router } from "express";
import { authMiddleware } from "../middellwares/authMiddellware.js";
import {
  isAdmin,
  isAdminOrEnseignant,
} from "../middellwares/roleMiddellware.js";

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
router.post("/", authMiddleware, isAdmin, createCompetence);
router.get("/", authMiddleware, isAdminOrEnseignant, getCompetences);
router.get("/:id", authMiddleware, isAdmin, getCompetenceById);
router.patch("/:id", authMiddleware, isAdmin, updateCompetence);
router.delete("/:id", authMiddleware, isAdmin, deleteCompetence);

export default router;
