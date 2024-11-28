import express, { Router } from "express";
import { fetchPfas } from "../controllers/pfaController.js";
import { authMiddleware } from "../middellwares/authMiddellware.js";
import { isAdmin } from "../middellwares/roleMiddellware.js";

const router = express.Router();

router.get("/getPfas", authMiddleware, isAdmin, fetchPfas);

export default router;
