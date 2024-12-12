import express, { Router } from "express";
import {
  createEtudiant,
  getEtudiants,
  login,
  logout,
  getEtudiantById,
  updateEtudiantById,
  updateEtudiantPassword,
  deleteOrArchiveStudentById,
  getEnseignants,
  getEnseignantById,
  updateEnseignantById,
  updateEnseignantPassword,
  createEnseignant,
  deleteOrArchiveEnseignantById,
  addStudentsFromFile,
  addTeachersFromFile
} from "../controllers/UserController.js";
import { authMiddleware } from "../middellwares/authMiddellware.js";
import { isAdmin, isAdminOrEnseignant } from "../middellwares/roleMiddellware.js";

import multer from "multer"; // Import multer to handle file uploads

const router = express.Router();

// Setup multer to handle file uploads in memory
const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).single("studentsFile");

// POST route for creating or adding multiple students from a file
router.post("/students", authMiddleware, isAdmin, upload, async (req, res) => {
  try {
    if (req.file) {
      // If a file is uploaded, handle file processing and add students
      return addStudentsFromFile(req, res);
    } else {
      // If no file is uploaded, proceed with creating a single student
      return createEtudiant(req, res);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Other routes
router.get("/students", authMiddleware, isAdminOrEnseignant, getEtudiants);
router.get("/students/:id", authMiddleware, isAdmin, getEtudiantById);
router.patch("/students/:id", authMiddleware, isAdmin, updateEtudiantById);
router.patch("/students/:id/password",authMiddleware,isAdmin,updateEtudiantPassword);
router.delete("/students/:id",authMiddleware,isAdmin,deleteOrArchiveStudentById);

// Routes for Enseignants (Teachers)
router.post("/teachers", authMiddleware, isAdmin, upload, async (req, res) => {
  try {
    if (req.file) {
      // If a file is uploaded, handle batch teacher creation from the file
      return addTeachersFromFile(req, res);
    } else {
      // If no file is uploaded, proceed with creating a single teacher
      return createEnseignant(req, res);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
router.get("/teachers", authMiddleware, isAdmin, getEnseignants);
router.get("/teachers/:id", authMiddleware, getEnseignantById);
router.patch("/teachers/:id", authMiddleware, updateEnseignantById);
router.patch("/teachers/:id/password",authMiddleware,isAdmin,updateEnseignantPassword);
router.delete("/teachers/:id",authMiddleware,isAdmin,deleteOrArchiveEnseignantById);

router.post("/auth/logout", authMiddleware, logout);
router.post("/auth/login", login);

export default router;
