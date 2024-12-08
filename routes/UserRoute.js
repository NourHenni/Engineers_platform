import express, { Router } from "express";
import {createEtudiant, 
    getEtudiants, 
    login, 
    getEtudiantById, 
    updateEtudiantById, 
    updateEtudiantPassword, 
    deleteEtudiantById, 
    getEnseignants,
    getEnseignantById,
    updateEnseignantById,
    updateEnseignantPassword,
    deleteEnseignantById,
    createEnseignant} from "../controllers/UserController.js";
import { authMiddleware } from "../middellwares/authMiddellware.js";
import { isAdmin } from "../middellwares/roleMiddellware.js";

const router = express.Router();




// Routes for Etudiants (Students)

router.post("/students", createEtudiant); 
router.post("/auth/login", login);
router.get("/students", authMiddleware, isAdmin, getEtudiants);  
router.get("/students/:id", authMiddleware, getEtudiantById);  
router.patch("/students/:id", authMiddleware, updateEtudiantById);
router.patch("/students/:id/password", authMiddleware, isAdmin, updateEtudiantPassword);  
router.delete("/students/:id", authMiddleware, isAdmin, deleteEtudiantById);  

// Routes for Enseignants (Teachers)

router.post("/teachers", createEnseignant);  
router.get("/teachers", authMiddleware, isAdmin, getEnseignants);  
router.get("/teachers/:id", authMiddleware, getEnseignantById);  
router.patch("/teachers/:id", authMiddleware, updateEnseignantById); 
router.patch("/teachers/:id/password", authMiddleware, isAdmin, updateEnseignantPassword); 
router.delete("/teachers/:id", authMiddleware, isAdmin, deleteEnseignantById);

export default router;
