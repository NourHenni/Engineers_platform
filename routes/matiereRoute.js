import express from "express";
const router = express.Router();
import matiereController from "../controllers/matiereController.js";

// Routes CRUD
router.post("/", matiereController.createMatiere);
router.get("/", matiereController.getMatieres);
router.get('/enseignants/:enseignantId/matieres', matiereController.getMatieresByEnseignant);

export default router;
