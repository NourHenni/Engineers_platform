import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import dotenv from "dotenv";

// Charger les variables d'environnement
dotenv.config();

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(403).json({ error: "Authorization token missing" });
    }

    // Verify the JWT token
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId;

    // Log the decoded token to check its structure
    console.log("Decoded Token:", decodedToken);

    req.user = decodedToken;  // Attach the decoded token to req.user

    // Fetch the user from the database
    const user = await User.findOne({ _id: userId });
    if (user) {
      req.auth = {
        userId: userId,
        role: user.role,
      };
      console.log("User in authMiddleware:", req.auth); // Log the user and role
      return next();
    } else {
      return res.status(401).json({ error: "User doesn't exist" });
    }
  } catch (error) {
    console.error("Authentication error:", error.message);
    return res.status(401).json({ error: error.message });
  }
};
