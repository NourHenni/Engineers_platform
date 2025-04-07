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
  ajouterSoutenance,
  modifierSoutenance,
  publierOuMasquerSoutenances,
  sendPlanningSoutenances,
  fetchPlanningSoutenances,
  getPfaByAnnee,
  getPeriod,
  getStudentsPfa,
  fetchPublishedPfaCodes,
  fetchPfaChoices,
  fetchPfaChoiceById,
  fetchStudentNiveau,
  getPfaChoicesByStudent,
} from "../controllers/pfaController.js";

import {
  isAdmin,
  isAdminOrStudent,
  isEnseignant,
  isEtudiant,
} from "../middellwares/roleMiddellware.js";

const router = express.Router();

/* -------------------------------------------------------------------------- */
/*                                 Admin Routes                               */
/* -------------------------------------------------------------------------- */

//1.1.POST request
router.post("/open", isAdmin, addPeriod); //OK

//1.3 GET request
router.get("/open", isAdmin, getPeriodes); //OK

//1.3 GET PERIOD
router.get("/open/:id", isAdmin, getPeriod); //OK
//1.2.PATCH request
router.patch("/open", isAdmin, updateDelais); //OK

//3.1.GET request
router.get("/getPfas", isAdmin, fetchPfas); //OK

//3.1.& 4.1.GET request
router.get("/getPfas/:idPFA", isAdminOrStudent, fecthPfaById);

//3.1.PATCH request
router.patch("/ChangeStatePFA/:idPFA", isAdmin, changeState); //OK

//3.3.PATCH request
router.patch("/publish/:response", isAdmin, publishPfas); //OK

//3.4.POST request
router.post("/list/send", isAdmin, sendListePfa); //OK

// GET PFA CHOICES
router.get("/pfasChoice/:id", isAdmin, fetchPfaChoiceById);
//7.2.PATCH request
router.patch("/assign", isAdmin, automatedAssignment);

//7.3.PATCH request
router.patch(
  "/:pfaId/assign/student/:studentId/:secondStudentId?",
  isAdmin,
  manualAssignment
);

//7.4.POST request
router.post("/publish/pfas/:response", isAdmin, publishAffectedPfas);

//7.5.POST request
router.post("/list/pfas/send", isAdmin, sendListePfaAffected);

//8.1.POST request
router.post("/soutenances/", isAdmin, ajouterSoutenance);

//8.2.GET request
router.get("/pfa", isAdmin, fetchPlanningSoutenances);

//8.3.PATCH request
router.patch("/:id/soutenances/", isAdmin, modifierSoutenance);

//8.4.POST request
router.post("/publish/:response", isAdmin, publierOuMasquerSoutenances);

//8.5.POST request
router.post("/list/send/soutenances", isAdmin, sendPlanningSoutenances);

//GET request
router.get("/getPfaAnnee/:annee", isAdmin, getPfaByAnnee);

/* -------------------------------------------------------------------------- */
/*                                 Teacher Routes                             */
/* -------------------------------------------------------------------------- */

//2.1.POST request
router.post("/post", isEnseignant, ajouterSujetPfa); //ok

//2.2.GET request - consulter tous les sujets
router.get("/mine", isEnseignant, getAllPfasByTeacher); //ok

//2.2.GET request - consulter tous les sujets
router.get("/students", isEnseignant, getStudentsPfa); //no

//2.2.GET request - les informations d'un sujet
router.get("/:id/mine", isEnseignant, getPfaByIdForTeacher); //pk

//2.2.PATCH request - Modifier les infos d'un sujet PFA
router.patch("/:id/mine", isEnseignant, modifyPfaSubject); //no

//2.3.Delete request
router.delete("/:id", isEnseignant, deletePfa); //ok

/* -------------------------------------------------------------------------- */
/*                                 Student Routes                             */
/* -------------------------------------------------------------------------- */

//5.1.PATCH request
router.patch("/choiceSubject", isEtudiant, choosePfaSubjects);

//5.2.PATCH request
router.patch("/updateChoice", isEtudiant, updateAcceptedPfa);

//GET request
router.get("/", isEtudiant, getPfasByTeacherForStudents);

// GET REQUEST -FETCH CODE PFAS
router.get("/publishedCode", isEtudiant, fetchPublishedPfaCodes);

// GET PFA CHOICES
router.get("/pfasChoices", isAdminOrStudent, fetchPfaChoices);

// GET PFA CHOICES
router.get("/getChoices", isEtudiant, getPfaChoicesByStudent);

//GET request
router.get("/getPublishedPfas", isEtudiant, fetchPublishedPfa); //OK

//GET request
router.get("/getAssignedPfas", isEtudiant, fetchAssignedPfa);

//10.1.GET request
router.get("/students/mine", isEtudiant, fetchMyPfa);

//GET STUDENT PAR NIVEAU
router.get("/studentsPfas", fetchStudentNiveau);
export default router;
