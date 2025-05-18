import { Router } from "express";
import { getLastYear } from "../controllers/appController.js";
const router = Router();


router.get('/lastyear', getLastYear);

export default router;
