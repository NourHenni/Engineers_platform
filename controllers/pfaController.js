import pfaModel from "../models/pfaModel.js";
import userModel from "../models/userModel.js";

export const fetchPfas = async (req, res) => {
  try {
    if (req.auth.role === "admin") {
      const foundUsers = await userModel.find({ role: "admin" });
    } else {
      console.log("Vous n'avez pas les permissions nécessaires.");
    }
    const sujetsPfa = await pfaModel.find();

    if (sujetsPfa.length === 0) {
      res.status(400).json({ message: " pas encore de sujets pfa déposés" });
    } else {
      res.status(200).json({ model: sujetsPfa, message: " Les sujets pfas" });
    }
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
