import express from "express";
import { getAllPeriods, postInternship } from "../controllers/stageEteController.js";
import { getInternshipsByType } from "../controllers/stageEteController.js";
import { authMiddleware } from "../middellwares/authMiddellware.js";
import { isEtudiant ,isAdmin ,isEnseignant,isAdminOrTeacher} from "../middellwares/roleMiddellware.js";
import { upload } from "../middellwares/uploadMiddellware.js";
import { getStageDetails } from "../controllers/stageEteController.js";
import { getEnseignants } from "../controllers/stageEteController.js";
import { assignTeachersToStages } from "../controllers/stageEteController.js";
import {updateAssignedTeacher} from "../controllers/stageEteController.js";
import {publishOrHidePlanning} from "../controllers/stageEteController.js";
import { sendPlanning } from "../controllers/stageEteController.js";
import { getAssignedStages } from "../controllers/stageEteController.js";
import {planifierSoutenance } from "../controllers/stageEteController.js";

import { addPeriod } from "../controllers/stageEteController.js";
//import { getAllPeriods } from "../controllers/stageEteController.js";
import { updatePeriod } from "../controllers/stageEteController.js"




const router = express.Router();

// Route : POST /internship/:type/post
router.post( "/internship/:type/post",authMiddleware, isEtudiant,
 // upload.array("files", 3),
  upload.fields([
    { name: "rapport", maxCount: 1 },
    { name: "attestation", maxCount: 1 },
    { name: "ficheEvaluation", maxCount: 1 },
  ]),
  postInternship
);
router.get("/internship/:type", authMiddleware, isAdmin, getInternshipsByType);
router.get("/teachers", authMiddleware, isAdmin, getEnseignants);
router.get("/internship/:type/:id", authMiddleware, isAdminOrTeacher,  getStageDetails);
router.post("/internship/:type/planning/assign",authMiddleware, isAdmin, assignTeachersToStages);
router.patch("/:type/planning/update", authMiddleware, isAdmin, updateAssignedTeacher);
router.post("/:type/planning/publish/:response", authMiddleware, isAdmin, publishOrHidePlanning);
// Endpoint pour envoyer le planning par email
router.post("/:type/planning/send",
  authMiddleware,
  isAdmin,
  sendPlanning
);

router.post('/internship/:type/:id', authMiddleware, isEnseignant, planifierSoutenance);
router.get("/:type/sing",authMiddleware,isEnseignant,getAssignedStages);
router.post("/:type/open",authMiddleware, isAdmin, addPeriod);
router.get("/:type/open",authMiddleware, isAdmin, getAllPeriods);
router.patch("/internship/:type/open", updatePeriod);


export default router;
