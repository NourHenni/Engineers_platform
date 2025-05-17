import express from "express";
import {
  createMatiere,
  deleteMatiere,
  getMatiereDetail,
  getMatieres,
  publishOrHideMatieres,
  updateAvancement,
  updateMatiere,
  proposeModification,
  validateModification,
  addEvaluation,
  getEvaluations,
  EnvoiEmailEvaluation,
  updateCurriculum,
} from "../controllers/matiereController.js";

import { authMiddleware } from "../middellwares/authMiddellware.js";
import {
  isAdmin,
  isEnseignant,
  isEtudiant,
  isAdminOrEnseignant,
} from "../middellwares/roleMiddellware.js";
const router = express.Router();

// Routes CRUD

router.post("/", authMiddleware, isAdmin, createMatiere);
router.get("/", authMiddleware, getMatieres);
router.get("/:id", authMiddleware, getMatiereDetail);
router.post(
  "/publish/:response",
  authMiddleware,
  isAdmin,
  publishOrHideMatieres
);
router.patch("/:id/avancement", authMiddleware, isEnseignant, updateAvancement);
router.patch("/:id", authMiddleware, isAdmin, updateMatiere);
router.delete("/:id", authMiddleware, isAdmin, deleteMatiere);
router.patch(
  "/:id/proposition",
  authMiddleware,
  isEnseignant,
  proposeModification
);
//router.get("/:id/validate", authMiddleware, isAdmin, validateModification);

router.patch("/:id/validate", authMiddleware, isAdmin, validateModification);
router.get("/:id/propositions", authMiddleware, isAdmin, async (req, res) => {
  try {
    const matiere = await Matiere.findById(req.params.id).populate(
      "historiquePropositions.enseignant",
      "nom prenom email"
    );

    res.status(200).json(matiere.historiquePropositions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/:id/curriculum", authMiddleware, isEnseignant, updateCurriculum);
router.post("/evaluation", authMiddleware, isAdmin, EnvoiEmailEvaluation);
router.post("/:id/evaluation", authMiddleware, isEtudiant, addEvaluation);
router.get(
  "/:id/evaluation",
  authMiddleware,
  isAdminOrEnseignant,
  getEvaluations
);

export default router;
