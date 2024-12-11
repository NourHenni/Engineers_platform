import express, { Router } from "express";
import { createUser, getUsers, login } from "../controllers/UserController.js";
import { authMiddleware } from "../middellwares/authMiddellware.js";
import { isAdmin } from "../middellwares/roleMiddellware.js";
import { getTeachers } from "../controllers/UserController.js";

const router = express.Router();

router.post("/users/createUser", createUser);
router.post("/users/login", login);
router.get("/users/getUsers", authMiddleware, isAdmin, getUsers);
router.get("/teachers", authMiddleware, isAdmin, getTeachers);

export default router;
