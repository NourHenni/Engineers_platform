import express from "express";
import {createMatiere,getMatieres,publishOrHideMatieres,getMatieresByEnseignant,updateAvancement} from "../controllers/matiereController.js";
import { authMiddleware } from "../middellwares/authMiddellware.js";
import {isAdmin,isEnseignant,isEnseignantOrEtudiant} from "../middellwares/roleMiddellware.js";
const router = express.Router();

// Routes CRUD

router.post("/",authMiddleware,isAdmin, createMatiere);
router.get("/getmatieres",authMiddleware,isAdmin, getMatieres);
router.get("/getmatieres/:id",authMiddleware,isEnseignantOrEtudiant, getMatieres);
router.post("/publish/:response",authMiddleware, isAdmin,publishOrHideMatieres);
router.patch("/:id/avancement", authMiddleware, isEnseignant, updateAvancement);

export default router;
