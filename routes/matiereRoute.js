import express from "express";
import { createMatiere, getMatieres, publishOrHideMatieres} from "../controllers/matiereController.js";
import { authMiddleware } from "../middellwares/authMiddellware.js";
import { isAdmin, isEnseignantOrEtudiant } from "../middellwares/roleMiddellware.js";
const router = express.Router();


// Routes CRUD
router.post("/",authMiddleware,isAdmin, createMatiere);
router.get("/getmatieres",authMiddleware,isAdmin, getMatieres);
router.get("/getmatieres/:id",authMiddleware,isEnseignantOrEtudiant, getMatieres);
router.post("/publish/:response",authMiddleware, isAdmin,publishOrHideMatieres);



export default router;
