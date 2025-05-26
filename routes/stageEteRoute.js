import express from "express";
import { postInternship} from "../controllers/stageEteController.js";
import { getInternshipsByTypeAndYear } from "../controllers/stageEteController.js";
import { authMiddleware } from "../middellwares/authMiddellware.js";
import {
  isEtudiant,
  isAdmin,
  isEnseignant,
  isAdminOrEnseignant,
  isStillStudent,
} from "../middellwares/roleMiddellware.js";
import { upload } from "../middellwares/uploadMiddellware.js";
import { getStageDetails } from "../controllers/stageEteController.js";
import { getEnseignants } from "../controllers/stageEteController.js";
import { assignTeachersToStages } from "../controllers/stageEteController.js";
import { updateAssignedTeacher } from "../controllers/stageEteController.js";
import { publishOrHidePlanning } from "../controllers/stageEteController.js";
import { sendPlanning } from "../controllers/stageEteController.js";
import { getAssignedStages } from "../controllers/stageEteController.js";
import { planifierSoutenance } from "../controllers/stageEteController.js";
import { modifierSoutenance } from "../controllers/stageEteController.js";
import { consulterAffectationByType } from "../controllers/stageEteController.js";
import { validerSujet } from "../controllers/stageEteController.js";

import { addPeriod } from "../controllers/stageEteController.js";
import { getAllPeriods } from "../controllers/stageEteController.js";
import { updatePeriod } from "../controllers/stageEteController.js";
import {deletePeriod}from "../controllers/stageEteController.js";

const router = express.Router();

router.post("/open", authMiddleware, isAdmin, addPeriod);
router.get("/periodes", authMiddleware, isAdmin, getAllPeriods);
router.patch("updateperiode/:id", authMiddleware, isAdmin, updatePeriod);
router.delete("periode/:id", authMiddleware, isAdmin,deletePeriod);

// Route : POST /internship/:type/post
router.post(
  "/:type/post",
  authMiddleware,
  isEtudiant,
 
  // upload.array("files", 3),
  upload.fields([
    { name: "rapport", maxCount: 1 },
    { name: "attestation", maxCount: 1 },
    { name: "ficheEvaluation", maxCount: 1 },
  ]),
  postInternship
);
router.get("/filter/:type/:anneeStage", authMiddleware, isAdmin, getInternshipsByTypeAndYear);
router.get("/teachers", authMiddleware, isAdmin, getEnseignants);
router.get("/:type/:id", authMiddleware, isAdminOrEnseignant, getStageDetails);
router.post(
  "/:type/planning/assign",
  authMiddleware,
  isAdmin,
  assignTeachersToStages
);
router.patch(
  "/:type/planning/update",
  authMiddleware,
  isAdmin,
  updateAssignedTeacher
);
router.post(
  "/:type/planning/publish/:response",
  authMiddleware,
  isAdmin,
  publishOrHidePlanning
);
// Endpoint pour envoyer le planning par email
router.post("/:type/planning/send", authMiddleware, isAdmin, sendPlanning);
router.get(
  "/:type/assign/tome",
  authMiddleware,
  isEnseignant,
  getAssignedStages
);
router.post("/:type/:id", authMiddleware, isEnseignant, planifierSoutenance);
router.patch("/:type/:id", authMiddleware, isEnseignant, modifierSoutenance);
router.get("/monpv/:type/me", authMiddleware, isEtudiant,  consulterAffectationByType);
router.patch("/valider/:type/:id", authMiddleware, isEnseignant, validerSujet);

export default router;
