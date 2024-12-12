import express, { Router } from "express";
import {
  fetchPfas,
  addPeriode,
  getPeriodes,
  updateDelais,
  fecthPfaById,
  changeState,
  publishPfas,
  addPeriod,
  ajouterSujetPfa,
  getAllPfasByTeacher,
  getPfaByIdForTeacher,
  modifyPfaSubject,
  deletePfa,
  getPfasByTeacherForStudents,
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
router.post("/open", addPeriod);
router.get("/open", getPeriodes);
router.patch("/open", updateDelais);
router.post("/post", isEnseignant, ajouterSujetPfa);
router.get("/mine", isEnseignant, getAllPfasByTeacher);
router.get("/:id/mine", isEnseignant, getPfaByIdForTeacher);
router.patch("/:id/mine", isEnseignant, modifyPfaSubject);
router.delete("/:id", isEnseignant, deletePfa);
router.get("/", isEtudiant, getPfasByTeacherForStudents);

export default router;
