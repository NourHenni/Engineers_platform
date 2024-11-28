import express from "express";
import {
  addPeriode,
  getPeriodes,
  updateDelais,
} from "../controllers/pfaController.js";
import { isAdmin } from "../middellwares/roleMiddellware.js";

// Route pour ajouter une période
const router = express.Router();
router.post("/PFA/open", addPeriode);
router.get("/PFA/open", getPeriodes);
router.patch("/PFA/open", updateDelais);
export default router;
