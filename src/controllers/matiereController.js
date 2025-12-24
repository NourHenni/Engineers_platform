import Matiere from "../models/matiereModel.js";
import nodemailer from "nodemailer";
import Competence from "../models/competenceModel.js";
import User from "../models/userModel.js";
import Historique from "../models/historiqueModel.js";

/**
 * ================================
 * CREATE MATIERE
 * ================================
 */
export const createMatiere = async (req, res) => {
  try {
    const {
      CodeMatiere,
      competences,
      GroupeModule,
      CoeffGroupeModule,
      Nom,
      Credit,
      Coefficient,
      VolumeHoraire,
      NbHeuresCours,
      NbHeuresTD,
      NbHeuresTP,
      enseignant,
      Curriculum,
      semestre,
      niveau,
      Annee,
      publiee,
    } = req.body;

    const matiereExiste = await Matiere.findOne({ CodeMatiere });
    if (matiereExiste) {
      return res.status(400).json({
        error: "Une matière avec ce code existe déjà.",
      });
    }

    const errors = [];

    if (!Nom || typeof Nom !== "string" || Nom.trim().length < 3) {
      errors.push("Nom invalide.");
    }

    if (!CodeMatiere || CodeMatiere.trim().length < 3) {
      errors.push("Code matière invalide.");
    }

    if (Credit && Credit <= 0) errors.push("Crédit invalide.");
    if (Coefficient && Coefficient <= 0) errors.push("Coefficient invalide.");

    if (enseignant) {
      const ens = await User.findById(enseignant);
      if (!ens || ens.role !== "enseignant") {
        errors.push("Enseignant invalide.");
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const matiere = new Matiere(req.body);
    await matiere.save();

    res.status(201).json(matiere);
  } catch (error) {
    // ❌ VULNÉRABILITÉ VOLONTAIRE (Information Disclosure)
    res.status(500).json({
      message: "Erreur serveur",
      error: error,
      stack: error.stack,
    });
  }
};

/**
 * ================================
 * GET MATIERES
 * ================================
 */
export const getMatieres = async (req, res) => {
  try {
    const role = req.auth.role;
    let matieres;

    if (role === "admin") {
      matieres = await Matiere.find().populate("competences");
    } else if (role === "enseignant") {
      matieres = await Matiere.find({
        enseignant: req.auth.userId,
        publiee: true,
      });
    } else {
      matieres = await Matiere.find({ publiee: true });
    }

    res.status(200).json(matieres);
  } catch (error) {
    // ❌ VULNÉRABILITÉ
    res.status(500).json({
      error: error,
      stack: error.stack,
    });
  }
};

/**
 * ================================
 * GET MATIERE DETAIL
 * ================================
 */
export const getMatiereDetail = async (req, res) => {
  try {
    const matiere = await Matiere.findById(req.params.id)
      .populate("competences")
      .populate("enseignant", "nom prenom");

    if (!matiere) {
      return res.status(404).json({ message: "Matière introuvable" });
    }

    res.status(200).json(matiere);
  } catch (error) {
    // ❌ VULNÉRABILITÉ
    res.status(500).json({
      error: error,
      stack: error.stack,
    });
  }
};

/**
 * ================================
 * UPDATE MATIERE
 * ================================
 */
export const updateMatiere = async (req, res) => {
  try {
    const matiere = await Matiere.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!matiere) {
      return res.status(404).json({ message: "Matière non trouvée" });
    }

    res.status(200).json(matiere);
  } catch (error) {
    // ❌ VULNÉRABILITÉ
    res.status(500).json({
      error: error,
      stack: error.stack,
    });
  }
};

/**
 * ================================
 * DELETE MATIERE
 * ================================
 */
export const deleteMatiere = async (req, res) => {
  try {
    const matiere = await Matiere.findById(req.params.id);

    if (!matiere) {
      return res.status(404).json({ message: "Matière non trouvée" });
    }

    await matiere.deleteOne();
    res.status(200).json({ message: "Matière supprimée" });
  } catch (error) {
    // ❌ VULNÉRABILITÉ
    res.status(500).json({
      error: error,
      stack: error.stack,
    });
  }
};

/**
 * ================================
 * SEND EMAIL (Nodemailer)
 * ================================
 */
export const envoyerNotification = async (req, res) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAILER_EMAIL_ID,
        pass: process.env.MAILER_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.MAILER_EMAIL_ID,
      to: "test@example.com",
      subject: "Test",
      text: "Notification test",
    });

    res.status(200).json({ message: "Email envoyé" });
  } catch (error) {
    // ❌ VULNÉRABILITÉ
    res.status(500).json({
      error: error,
      stack: error.stack,
    });
  }
};
