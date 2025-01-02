import express from "express";
import {
  createMatiere,
  getMatieres,
  publishOrHideMatieres,
  updateAvancement,
  proposeModification,
  validateModification,
  addEvaluation,
  getEvaluations,
  EnvoiEmailEvaluation,
} from "../controllers/matiereController.js";
import { authMiddleware } from "../middellwares/authMiddellware.js";
import {
  isAdmin,
  isEnseignant,
  isEnseignantOrEtudiant,
  isEtudiant,
  isAdminOrEnseignant,
} from "../middellwares/roleMiddellware.js";
const router = express.Router();

// Routes CRUD

router.post("/", authMiddleware, isAdmin, createMatiere);
router.get("/getmatieres", authMiddleware, isAdmin, getMatieres);
router.get(
  "/getmatieres/:id",
  authMiddleware,
  isEnseignantOrEtudiant,
  getMatieres
);
router.post(
  "/publish/:response",
  authMiddleware,
  isAdmin,
  publishOrHideMatieres
);
router.patch("/:id/avancement", authMiddleware, isEnseignant, updateAvancement);
router.patch(
  "/:id/proposition",
  authMiddleware,
  isEnseignant,
  proposeModification
);
router.get("/:id/validate", authMiddleware, isAdmin, validateModification);
router.post("/evaluation", authMiddleware, isAdmin, EnvoiEmailEvaluation);
router.post("/:id/evaluation", authMiddleware, isEtudiant, addEvaluation);
router.get(
  "/:id/evaluation",
  authMiddleware,
  isAdminOrEnseignant,
  getEvaluations
);
export default router;
