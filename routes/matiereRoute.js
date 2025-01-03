import express from "express";
import {
  createMatiere,
  deleteMatiere,
  getMatiereDetail,
  getMatieres,
  publishOrHideMatieres,
  updateAvancement,
  updateMatiere,
} from "../controllers/matiereController.js";

import { authMiddleware } from "../middellwares/authMiddellware.js";
import {
  isAdmin,
  isEnseignant,
} from "../middellwares/roleMiddellware.js";
const router = express.Router();

// Routes CRUD

router.post("/", authMiddleware, isAdmin, createMatiere);
router.get("/", authMiddleware,getMatieres);
router.get("/:id", authMiddleware,getMatiereDetail);
router.post("/publish/:response",authMiddleware,isAdmin,publishOrHideMatieres);
router.patch("/:id/avancement", authMiddleware, isEnseignant, updateAvancement);
router.patch("/:id",authMiddleware,isAdmin,updateMatiere);
router.delete("/:id",authMiddleware,isAdmin,deleteMatiere);

export default router;
