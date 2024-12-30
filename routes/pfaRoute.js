import express, { Router } from "express";
import {
  fetchPfas,
  getPeriodes,
  updateDelais,
  fecthPfaById,
  changeState,
  publishPfas,
  addPeriod,
  sendListePfa,
  fetchPublishedPfa,
  ajouterSujetPfa,
  getAllPfasByTeacher,
  getPfaByIdForTeacher,
  modifyPfaSubject,
  deletePfa,
  getPfasByTeacherForStudents,
  choosePfaSubjects,
  updateAcceptedPfa,
  automatedAssignment,
  manualAssignment,
  publishAffectedPfas,
  sendListePfaAffected,
  fetchAssignedPfa,
  fetchMyPfa,
} from "../controllers/pfaController.js";

import {
  isAdmin,
  isAdminOrStudent,
  isEnseignant,
  isEtudiant,
} from "../middellwares/roleMiddellware.js";

const router = express.Router();

router.get("/getPfas", isAdmin, fetchPfas);
router.get("/getPfas/:idPFA", isAdminOrStudent, fecthPfaById);
router.patch("/ChangeStatePFA/:idPFA", isAdmin, changeState);
router.patch("/publish/:response", isAdmin, publishPfas);
router.get("/getPublishedPfas", isEtudiant, fetchPublishedPfa);
router.post("/list/send", isAdmin, sendListePfa);
router.patch("/choiceSubject", isEtudiant, choosePfaSubjects);
router.patch("/updateChoice", isEtudiant, updateAcceptedPfa);
router.patch("/assign", isAdmin, automatedAssignment);
router.patch(
  "/:pfaId/assign/student/:studentId/:secondStudentId?",
  isAdmin,
  manualAssignment
);
router.post("/publish/pfas/:response", isAdmin, publishAffectedPfas);
router.post("/list/pfas/send", isAdmin, sendListePfaAffected);
router.get("/getAssignedPfas", isEtudiant, fetchAssignedPfa);
router.get("/students/mine", isEtudiant, fetchMyPfa);
router.get("/open", isAdmin, getPeriodes);
router.patch("/open", isAdmin, updateDelais);
router.post("/post", isEnseignant, ajouterSujetPfa);
router.get("/mine", isEnseignant, getAllPfasByTeacher);
router.get("/:id/mine", isEnseignant, getPfaByIdForTeacher);
router.patch("/:id/mine", isEnseignant, modifyPfaSubject);
router.delete("/:id", isEnseignant, deletePfa);
router.get("/", isEtudiant, getPfasByTeacherForStudents);

export default router;
