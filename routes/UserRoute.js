import express, { Router } from "express";
import { createUser, getUsers, login,getUserById,updateUserById, updatePassword, deleteUserById } from "../controllers/UserController.js";
import { authMiddleware } from "../middellwares/authMiddellware.js";
import { isAdmin } from "../middellwares/roleMiddellware.js";

const router = express.Router();

router.post("/students", createUser);
router.post("/auth/login", login);
router.get("/students", authMiddleware, isAdmin, getUsers);
router.get("/students/:id", authMiddleware, getUserById);
router.patch("/students/:id", authMiddleware, updateUserById);
router.patch("/students/:id/password", authMiddleware, isAdmin, updatePassword);
router.delete("/students/:id", authMiddleware, isAdmin, deleteUserById);

export default router;
