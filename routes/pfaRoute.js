import express, { Router } from "express";
import {
  fetchPfas,
  addPeriode,
  getPeriodes,
  updateDelais,
  ajouterSujetPfa,
  getAllPfasByTeacher,
  getPfaByIdForTeacher,
  modifyPfaSubject,
  deletePfa,
  getPfasByTeacherForStudents,
} from "../controllers/pfaController.js";
import { authMiddleware } from "../middellwares/authMiddellware.js";
import { isAdmin, isEtudiant } from "../middellwares/roleMiddellware.js";
import { isEnseignant } from "../middellwares/roleMiddellware.js";
const router = express.Router();

router.get("/getPfas", authMiddleware, isAdmin, fetchPfas);
router.post("/open", addPeriode);
router.get("/open", getPeriodes);
router.patch("/open", updateDelais);
router.post("/post", authMiddleware, isEnseignant, ajouterSujetPfa);
router.get("/mine", authMiddleware, isEnseignant, getAllPfasByTeacher);
router.get("/:id/mine", authMiddleware, isEnseignant, getPfaByIdForTeacher);
router.patch("/:id/mine", authMiddleware, isEnseignant, modifyPfaSubject);
router.delete("/:id", authMiddleware, isEnseignant, deletePfa);
router.get("/", authMiddleware, isEtudiant, getPfasByTeacherForStudents);

export default router;
