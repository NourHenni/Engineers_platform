import express from "express";
import {
  fetchStagesEte,
  getAllPeriods,
  postInternship,
} from "../controllers/stageEteController.js";
import { getInternshipsByType } from "../controllers/stageEteController.js";
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

import { addPeriod } from "../controllers/stageEteController.js";
//import { getAllPeriods } from "../controllers/stageEteController.js";
import { updatePeriod } from "../controllers/stageEteController.js";

const router = express.Router();

router.post("/:niveau/open", authMiddleware, isAdmin, addPeriod);
router.get("/:niveau/open", authMiddleware, isAdmin, getAllPeriods);
router.patch("/:niveau/open", authMiddleware, isAdmin, updatePeriod);

// Route : POST /internship/:type/post
router.post(
  "/:type/post",
  authMiddleware,
  isEtudiant,
  isStillStudent,
  // upload.array("files", 3),
  upload.fields([
    { name: "rapport", maxCount: 1 },
    { name: "attestation", maxCount: 1 },
    { name: "ficheEvaluation", maxCount: 1 },
  ]),
  postInternship
);
router.get("/:type", authMiddleware, isAdmin, getInternshipsByType);
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




export default router;
