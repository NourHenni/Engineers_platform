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


export const updateAvancement = async (req, res) => {
  try {
    const { id } = req.params;
    const { chapitres, sections } = req.body; // Object contenant l'avancement des chapitres ou des sections avec dates

    // Trouver la matière par ID
    const materie = await Materie.findById(id);
    if (!materie) {
      return res.status(404).json({ message: "Matière non trouvée" });
    }

    // Mettre à jour l'avancement des chapitres ou sections
    if (chapitres) {
      chapitres.forEach((chapitre) => {
        const chapitreIndex = materie.Curriculum.findIndex(
          (c) => c.titreChapitre === chapitre.titreChapitre
        );
        if (chapitreIndex !== -1) {
          materie.Curriculum[chapitreIndex].AvancementChap =
            chapitre.AvancementChap;
          chapitre.sections.forEach((section) => {
            const sectionIndex = materie.Curriculum[
              chapitreIndex
            ].sections.findIndex((s) => s.nomSection === section.nomSection);
            if (sectionIndex !== -1) {
              materie.Curriculum[chapitreIndex].sections[
                sectionIndex
              ].AvancementSection = section.AvancementSection;
              materie.Curriculum[chapitreIndex].sections[
                sectionIndex
              ].DateModification = section.DateModification;
            }
          });
        }
      });
    }

    // Sauvegarder les changements
    await materie.save();

    // Fonction pour envoyer un email
    const sendEmail = async (to, subject, text) => {
      let transporter = nodemailer.createTransport({
        service: "gmail", // Utiliser votre fournisseur d'email
        auth: {
          user: process.env.EMAIL_USER, // Votre adresse email
          pass: process.env.EMAIL_PASSWORD, // Votre mot de passe

          user: "votre_email@gmail.com", // Remplacez par votre email
          pass: "votre_mot_de_passe", // Remplacez par votre mot de passe
        },
      });

      let mailOptions = {
        from: "votre_email@gmail.com", // Remplacez par votre email
        to: to,
        subject: subject,
        text: text,
      };

      await transporter.sendMail(mailOptions);
    };

    // Envoi des notifications
    // Envoi d'un mail à l'admin
    const adminEmail = "admin@example.com"; // Email de l'admin
    await sendEmail(
      adminEmail,
      "Mise à jour de l'avancement",
      "L'avancement d'une matière a été mis à jour."
    );

    // Envoi des mails aux étudiants
    const studentEmails = materie.etudiants || []; // Liste des emails des étudiants concernés
    for (let email of studentEmails) {
      await sendEmail(
        email,
        "Mise à jour de l'avancement de la matière",
        "Votre matière a été mise à jour. Veuillez vérifier votre progression."
      );
    }

    // Répondre avec la matière mise à jour
    res.status(200).json(materie);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }};



export default { createMatiere, getMatieres };

