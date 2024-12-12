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
      matieres = await Matiere.find({ enseignant: userId, publiee: true });
    } else if (userRole === "etudiant") {
      // Récupérer les matières correspondant au semestre de l'étudiant
      const etudiant = await User.findById(userId); // Supposons que l'étudiant a un attribut `semestre`
      if (!etudiant) {
        return res.status(404).json({ message: "Étudiant introuvable." });
      }

      const semestre = etudiant.semestre; // Exemple d'attribut dans le modèle utilisateur
      matieres = await Matiere.find({ Semestre: semestre, publiee: true });
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

export const updateAvancement = async (req, res) => {
  const { id } = req.params; // ID de la matière
  const { chapitreIndex, sectionIndex, nouveauStatut } = req.body;

  try {
    // Trouver la matière
    const matiere = await Matiere.findById(id);

    if (!matiere) {
      return res.status(404).json({ message: "Matière non trouvée" });
    }

    // Vérifier l'existence du chapitre
    const chapitre = matiere.Curriculum[chapitreIndex];
    if (!chapitre) {
      return res.status(400).json({ message: "Chapitre invalide" });
    }

    // Vérifier l'existence de la section
    const section = chapitre.sections[sectionIndex];
    if (!section) {
      return res.status(400).json({ message: "Section invalide" });
    }

    // Mettre à jour le statut de la section
    section.AvancementSection = nouveauStatut;

    // Ajouter la date de fin si la section est terminée
    if (nouveauStatut === "Terminee") {
      section.dateFinSection = new Date();
    }

    // Ajouter la date de fin si le chapitre est terminé
    if (nouveauStatut === "Terminee") {
      chapitre.dateFinChap = new Date();
    }

    // Si toutes les sections du chapitre sont "terminé", mettre à jour le statut du chapitre
    if (chapitre.sections.every((s) => s.AvancementSection === "Terminee")) {
      chapitre.AvancementChap = "Terminee";
    } else if (
      chapitre.sections.some((s) => s.AvancementSection === "EnCours")
    ) {
      chapitre.AvancementChap = "EnCours";
    } else {
      chapitre.AvancementChap = "NonCommencee";
    }
    // Activer automatiquement la section suivante si la section actuelle est terminée
    if (nouveauStatut === "Terminee" && chapitre.sections[sectionIndex + 1]) {
      chapitre.sections[sectionIndex + 1].AvancementSection = "EnCours";
      chapitre.AvancementChap = "EnCours";
    }
    // Enregistrer les modifications
    await matiere.save();
    // Récupérer les étudiants concernés
    const etudiants = await User.find({ role: "etudiant", matieres: id });

    if (!etudiants || etudiants.length === 0) {
      return res.status(400).json({ message: "Aucun étudiant trouvé" });
    }
    // Envoyer une réponse avec les détails mis à jour
    res.status(200).json({
      message: "Avancement mis à jour et notifications envoyées avec succès",
      matiere,
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'avancement :", error);
    res.status(500).json({ error: error.message });
  }

  // Notifier l'admin et les étudiants
  const admin = await User.findOne({ role: "admin" });

  // Configuration du transporteur Nodemailer
  const transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 465,
    auth: {
      user: process.env.MAILER_EMAIL_ID, // Votre adresse email
      pass: process.env.MAILER_PASSWORD, // Votre mot de passe
    },
  });
  const matiere = await Matiere.findById(id);

  // Vérifier l'existence du chapitre
  const chapitre = matiere.Curriculum[chapitreIndex];
  if (!chapitre) {
    return res.status(400).json({ message: "Chapitre invalide" });
  }
  // Vérifier l'existence de la section
  const section = chapitre.sections[sectionIndex];
  if (!section) {
    return res.status(400).json({ message: "Section invalide" });
  }
  // Envoi de l'email à l'administrateur
  if (admin) {
    const adminMailOptions = {
      from: process.env.MAILER_EMAIL_ID,
      to: admin.adresseEmail,
      subject: `Mise à jour de l'avancement pour la matière : "${matiere.Nom}"`,
      text: `Bonjour ${admin.nom},

La section "${section.nomSection}" du chapitre "${chapitre.titreChapitre}" a été mise à jour avec le statut : "${nouveauStatut}".

Cordialement,`,
    };
    await transporter.sendMail(adminMailOptions);
  }
  const etudiants = await User.find({ role: "etudiant", matieres: id });

  // Envoi de l'email aux étudiants
  for (const etudiant of etudiants) {
    const etudiantMailOptions = {
      from: process.env.MAILER_EMAIL_ID,
      to: etudiant.adresseEmail,
      subject: `Mise à jour de l'avancement pour la matière : "${matiere.Nom}"`,
      text: `Bonjour ${etudiant.nom},

La section "${section.nomSection}" du chapitre "${chapitre.titreChapitre}" a été mise à jour avec le statut : "${nouveauStatut}".

Vous pouvez consulter la progression de cette matière sur la plateforme.

Cordialement,`,
    };
    await transporter.sendMail(etudiantMailOptions);
  }
};

export default { createMatiere, getMatieres, getMatieresByEnseignant };
