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
} from "../controllers/pfaController.js";

import {
  isAdmin,
  isAdminOrStudent,
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

export default router;
