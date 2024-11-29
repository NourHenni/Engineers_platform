import express, { Router } from "express";
import {
  fetchPfas,
  addPeriode,
  getPeriodes,
  updateDelais,
} from "../controllers/pfaController.js";
import { authMiddleware } from "../middellwares/authMiddellware.js";
import { isAdmin } from "../middellwares/roleMiddellware.js";

const router = express.Router();

router.get("/getPfas", authMiddleware, isAdmin, fetchPfas);
router.post("/open", addPeriode);
router.get("/open", getPeriodes);
router.patch("/open", updateDelais);

export default router;
