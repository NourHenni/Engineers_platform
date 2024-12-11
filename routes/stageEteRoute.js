import express from "express";
import { postInternship } from "../controllers/stageEteController.js";
import { getInternshipsByType } from "../controllers/stageEteController.js";
import { authMiddleware } from "../middellwares/authMiddellware.js";
import { isEtudiant ,isAdmin ,isEnseignant} from "../middellwares/roleMiddellware.js";
import { upload } from "../middellwares/uploadMiddellware.js";
import { getStageDetails } from "../controllers/stageEteController.js";
//import { assignTeachersToStages } from "../controllers/stageEteController.js";



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
router.get("/internship/:type/:id", authMiddleware, isEnseignant, getStageDetails);
//router.post("/internship/:type/planning/assign", isAdmin, assignTeachersToStages);

export default router;
