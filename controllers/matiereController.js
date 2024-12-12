import Matiere from "../models/matiereModel.js";

import nodemailer from "nodemailer";

import User from "../models/userModel.js";

// Créer une nouvelle matière
export const createMatiere = async (req, res) => {
  try {
    const matiere = new Matiere(req.body);
    console.log("Objet Matiere créé :", matiere);
    await matiere.save();
    res.status(201).json(matiere);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getMatieres = async (req, res) => {
  try {
    const userId = req.params.id; // Obtenu depuis le middleware d'authentification
    const userRole = req.auth.role; // Obtenu depuis le middleware d'authentification

    let matieres;

    // Logique basée sur le rôle
    if (userRole === "enseignant") {
      matieres = await Matiere.find({ enseignant: userId , publiee: true });
    } else if (userRole === "etudiant") {
      // Récupérer les matières correspondant au semestre de l'étudiant
      const etudiant = await User.findById(userId); // Supposons que l'étudiant a un attribut `semestre`
      if (!etudiant) {
        return res.status(404).json({ message: "Étudiant introuvable." });
      }

      const semestre = etudiant.semestre; // Exemple d'attribut dans le modèle utilisateur
      matieres = await Matiere.find({ Semestre: semestre , publiee: true });
    } else if (userRole === "admin") {
      matieres = await Matiere.find(); // Admin peut voir toutes les matières
    } else {
      return res.status(403).json({
        message: "Accès refusé : rôle non autorisé.",
      });
    }

    if (!matieres || matieres.length === 0) {
      return res.status(404).json({ message: "Aucune matière trouvée." });
    }

    res.status(200).json(matieres);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



export const publishOrHideMatieres = async (req, res) => {
  try {
    const { response } = req.params; // "true" ou "false" dans l'URL
    const publishStatus = response === "true"; // Convertir en booléen

    // Mettre à jour toutes les matières
    const updatedMatieres = await Matiere.updateMany(
      {},
      { publiee: publishStatus }
    );

    if (updatedMatieres.matchedCount === 0) {
      return res.status(404).json({ message: "Aucune matière trouvée." });
    }

    res.status(200).json({
      success: true,
      message: `Toutes les matières ont été ${
        publishStatus ? "publiées" : "masquées"
      }.`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};





// Lire toutes les matières
/*export const getMatieres = async (req, res) => {
  try {
    const matieres = await Matiere.find();
    res.json(matieres);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};*/

export const getMatieresByEnseignant = async (req, res) => {
  try {
    // Récupérer l'ID de l'utilisateur connecté depuis le middleware d'authentification
    const enseignantId = req.params.id;

    // Vérifier si l'utilisateur est bien un enseignant
    const user = await User.findById(enseignantId);
    if (!user || user.role !== "enseignant") {
      return res
        .status(403)
        .json({ message: "Accès interdit. Vous n'êtes pas un enseignant." });
    }

    // Récupérer les matières associées à cet enseignant
    const matieres = await Matiere.find({ enseignant: enseignantId });

    // Vérifier si des matières existent
    if (!matieres || matieres.length === 0) {
      return res
        .status(404)
        .json({ message: "Aucune matière trouvée pour cet enseignant." });
    }

    // Retourner les matières
    res.status(200).json(matieres);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
export default { createMatiere, getMatieres, getMatieresByEnseignant };



