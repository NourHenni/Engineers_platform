import Matiere from "../models/matiereModel.js";

import nodemailer from "nodemailer";

import User from "../models/userModel.js";

import Historique from "../models/historiqueModel.js";

import competences from "../models/competenceModel.js";

export const createMatiere = async (req, res) => {
  try {
    const {
      enseignant,
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
      Curriculum,
      Semestre,
      Niveau,
      Annee,
      publiee,
    } = req.body;
// Vérifier si une matière avec le même CodeMatiere existe déjà
const matiereExiste = await Matiere.findOne({ CodeMatiere });
if (matiereExiste) {
  return res.status(400).json({ error: "Une matière avec ce code existe déjà." });
}

// Liste des erreurs
const errors = [];

    // Validation des attributs spécifiques
    if (!Nom || typeof Nom !== "string" || Nom.trim().length < 3) {
      errors.push("Le nom de la matière est obligatoire et doit contenir au moins 3 caractères.");
    }

    if (!CodeMatiere || typeof CodeMatiere !== "string" || CodeMatiere.trim().length < 3) {
      errors.push("Le code matière est obligatoire et doit contenir au moins 3 caractères.");
    }

    if (Credit !== undefined && (typeof Credit !== "number" || Credit <= 0)) {
      errors.push("Le crédit doit être un nombre positif.");
    }

    if (Coefficient !== undefined && (typeof Coefficient !== "number" || Coefficient <= 0)) {
      errors.push("Le coefficient doit être un nombre positif.");
    }

    if (VolumeHoraire !== undefined && (typeof VolumeHoraire !== "number" || VolumeHoraire <= 0)) {
      errors.push("Le volume horaire doit être un nombre positif.");
    }

    if (NbHeuresCours && (typeof NbHeuresCours !== "number" || NbHeuresCours < 0)) {
      errors.push("NbHeuresCours doit être un nombre non négatif.");
    }

    if (NbHeuresTD && (typeof NbHeuresTD !== "number" || NbHeuresTD < 0)) {
      errors.push("NbHeuresTD doit être un nombre non négatif.");
    }

    if (NbHeuresTP && (typeof NbHeuresTP !== "number" || NbHeuresTP < 0)) {
      errors.push("NbHeuresTP doit être un nombre non négatif.");
    }

    if (Curriculum && !Array.isArray(Curriculum)) {
      errors.push("Curriculum doit être un tableau.");
    }

    if (Semestre && !["S1", "S2", "S3", "S4", "S5"].includes(Semestre)) {
      errors.push("Semestre doit être l'une des valeurs suivantes : S1, S2, S3, S4, S5.");
    }

    if (Niveau && !["1ING", "2ING", "3ING"].includes(Niveau)) {
      errors.push("Niveau doit être l'une des valeurs suivantes : 1ING, 2ING, 3ING.");
    }

    if (Annee && (typeof Annee !== "number" || Annee < 2000 || Annee > 3000)) {
      errors.push("Annee doit être une année valide entre 2000 et 3000.");
    }

    if (publiee && typeof publiee !== "boolean") {
      errors.push("publiee doit être un booléen.");
    }

    if (competences && !Array.isArray(competences)) {
      errors.push("competences doit être un tableau.");
    }

    if (GroupeModule && (typeof GroupeModule !== "string" || GroupeModule.trim() === "")) {
      errors.push("GroupeModule doit être une chaîne de caractères non vide.");
    }

    if (CoeffGroupeModule && (typeof CoeffGroupeModule !== "number" || CoeffGroupeModule <= 0)) {
      errors.push("CoeffGroupeModule doit être un nombre positif.");
    }
    // Validation des enseignants
    if (enseignant) {
      const enseignantExiste = await User.findById(enseignant);
      if (!enseignantExiste) {
        errors.push("L'enseignant spécifié n'existe pas.");
      } else if (enseignantExiste.role !== "enseignant") {
        errors.push("L'utilisateur spécifié n'a pas le rôle d'enseignant.");
      }
    }

    // Validation des compétences
    if (competences && Array.isArray(competences) && competences.length > 0) {
      const competencesValides = await competences.find({ _id: { $in: competences } });
      if (competencesValides.length !== competences.length) {
        errors.push("Certaines compétences spécifiées n'existent pas.");
      }
    }

    // Retourner toutes les erreurs si elles existent
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    // Création et sauvegarde de la matière
    const matiere = new Matiere(req.body);
    await matiere.save();

    // Réponse réussie
    res.status(201).json(matiere);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};




export const getMatieres = async (req, res) => {
  try {
    const userId = req.auth.userId; // Obtenu depuis le middleware d'authentification
    const userRole = req.auth.role; // Obtenu depuis le middleware d'authentification

    let matieres;

    if (userRole === "admin") {
      // Admin peut voir toutes les matières
      matieres = await Matiere.find();
    } else if (["enseignant", "etudiant"].includes(userRole)) {
      // Vérifier si l'utilisateur existe
      const utilisateur = await User.findById(userId);
      if (!utilisateur) {
        return res
          .status(404)
          .json({
            message: `${
              userRole === "enseignant" ? "Enseignant" : "Étudiant"
            } introuvable.`,
          });
      }

      // Enseignant et étudiant voient uniquement les matières publiées
      matieres = await Matiere.find({ publiee: true });
    } else {
      return res
        .status(403)
        .json({ message: "Accès refusé : rôle non autorisé." });
    }

    if (matieres.length === 0) {
      return res.status(404).json({ message: "Aucune matière trouvée." });
    }

    res.status(200).json(matieres);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMatiereDetail = async (req, res) => {
  try {
    const matiereId = req.params.id; // Récupère l'ID de la matière
    const userRole = req.auth.role;  // Récupère le rôle de l'utilisateur depuis le middleware

    // Récupérer la matière par son ID avec la condition basée sur le rôle de l'utilisateur
    let matiere;
    if (userRole === "admin") {
      // Si l'utilisateur est un admin, il peut voir toutes les matières
      matiere = await Matiere.findById(matiereId);
    } else {
      // Si l'utilisateur n'est pas un admin, il ne peut voir que les matières publiées
      matiere = await Matiere.findOne({ _id: matiereId, publiee: true });
    }

    if (!matiere) {
      return res.status(404).json({
        message: userRole === "admin" ? "Matière introuvable." : "Matière non publiée ou introuvable."
      });
    }

    // Récupérer l'historique de la matière
    const historique = await Historique.find({ matiere: matiereId });

    // Retourner la matière avec son historique
    res.status(200).json({
      matiere,
      historique,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



export const updateMatiere = async (req, res) => {
  try {
    
    const matiereId = req.params.id;
    const matiereToUpdate = req.body; // Données envoyées dans le corps de la requête

        // Vérifier si la matière existe dans la base
    const existingMatiere = await Matiere.findById(matiereId);
    if (!existingMatiere) {
      return res.status(404).json({ message: "Matière non trouvée." });
    }

    const attributsAutorises = [
      "GroupeModule","CoeffGroupeModule","CodeMatiere","Nom","Credit","Coefficient","VolumeHoraire","NbHeuresCours",
      "NbHeuresTD","NbHeuresTP","Curriculum","Annee","archived","Semestre","Niveau","publiee","competences","enseignant"];
       // Valider les attributs de la requête
    const attributsInvalides = Object.keys(matiereToUpdate).filter(
      key => !attributsAutorises.includes(key)
    );
    if (attributsInvalides.length > 0) {
      return res.status(400).json({
        message: `Les attributs suivants ne sont pas valides : ${attributsInvalides.join(", ")}`
      });
    }
        // Vérifier si un attribut est vide ou indéfini
        const attributsVides = Object.keys(matiereToUpdate).filter(
          key => matiereToUpdate[key] === undefined || matiereToUpdate[key] === null || matiereToUpdate[key] === ""
        );
        if (attributsVides.length > 0) {
          return res.status(400).json({
            message: `Le(s) champ(s) suivant(s) est (sont) vide(s) : ${attributsVides.join(", ")}`
          });
        }
    

    // Liste des erreurs
    const errors = [];

    // Valider chaque attribut
    if (matiereToUpdate.GroupeModule && (typeof matiereToUpdate.GroupeModule !== 'string' || matiereToUpdate.GroupeModule.trim() === '')) {
      errors.push("GroupeModule doit être une chaîne de caractères non vide.");
    }

    if (matiereToUpdate.CoeffGroupeModule && (typeof matiereToUpdate.CoeffGroupeModule !== 'number' || matiereToUpdate.CoeffGroupeModule <= 0)) {
      errors.push("CoeffGroupeModule doit être un nombre positif.");
    }

    if (matiereToUpdate.CodeMatiere && (typeof matiereToUpdate.CodeMatiere !== 'string' || matiereToUpdate.CodeMatiere.length < 3)) {
      errors.push("CodeMatiere doit être une chaîne de caractères de 3 caractères minimum.");
    }

    if (matiereToUpdate.Nom && (typeof matiereToUpdate.Nom !== 'string' || matiereToUpdate.Nom.trim().length < 3)) {
      errors.push("Nom doit être une chaîne de caractères de 3 caractères minimum.");
    }

    if (matiereToUpdate.Credit && (typeof matiereToUpdate.Credit !== 'number' || matiereToUpdate.Credit <= 0)) {
      errors.push("Credit doit être un nombre positif.");
    }

    if (matiereToUpdate.Coefficient && (typeof matiereToUpdate.Coefficient !== 'number' || matiereToUpdate.Coefficient <= 0)) {
      errors.push("Coefficient doit être un nombre positif.");
    }

    if (matiereToUpdate.VolumeHoraire && (typeof matiereToUpdate.VolumeHoraire !== 'number' || matiereToUpdate.VolumeHoraire <= 0)) {
      errors.push("VolumeHoraire doit être un nombre positif.");
    }

    if (matiereToUpdate.NbHeuresCours && (typeof matiereToUpdate.NbHeuresCours !== 'number' || matiereToUpdate.NbHeuresCours < 0)) {
      errors.push("NbHeuresCours doit être un nombre non négatif.");
    }

    if (matiereToUpdate.NbHeuresTD && (typeof matiereToUpdate.NbHeuresTD !== 'number' || matiereToUpdate.NbHeuresTD < 0)) {
      errors.push("NbHeuresTD doit être un nombre non négatif.");
    }

    if (matiereToUpdate.NbHeuresTP && (typeof matiereToUpdate.NbHeuresTP !== 'number' || matiereToUpdate.NbHeuresTP < 0)) {
      errors.push("NbHeuresTP doit être un nombre non négatif.");
    }

    if (matiereToUpdate.Curriculum && !Array.isArray(matiereToUpdate.Curriculum)) {
      errors.push("Curriculum doit être un tableau.");
    }

    if (matiereToUpdate.Semestre && !['S1', 'S2', 'S3', 'S4', 'S5'].includes(matiereToUpdate.Semestre)) {
      errors.push("Semestre doit être l'une des valeurs suivantes : S1, S2, S3, S4, S5.");
    }

    if (matiereToUpdate.Niveau && !['1ING', '2ING', '3ING'].includes(matiereToUpdate.Niveau)) {
      errors.push("Niveau doit être l'une des valeurs suivantes : 1ING, 2ING, 3ING.");
    }

    if (matiereToUpdate.Annee && (typeof matiereToUpdate.Annee !== 'number' || matiereToUpdate.Annee < 2000 || matiereToUpdate.Annee > 3000)) {
      errors.push("Annee doit être une année valide entre 2000 et 3000.");
    }

    if (matiereToUpdate.publiee && typeof matiereToUpdate.publiee !== 'boolean') {
      errors.push("publiee doit être un booléen.");
    }

    if (matiereToUpdate.competences && !Array.isArray(matiereToUpdate.competences)) {
      errors.push("competences doit être un tableau.");
    }

    

// Vérification de l'existence de l'enseignant dans la base de données
if (matiereToUpdate.enseignant) {
  try {
    // Vérifie si l'enseignant existe et s'il a le rôle "enseignant"
    const enseignantExiste = await User.findById(matiereToUpdate.enseignant);

    if (!enseignantExiste) {
      errors.push("L'enseignant spécifié n'existe pas dans la base de données.");
    } else if (enseignantExiste.role !== 'enseignant') {
      errors.push("L'utilisateur spécifié n'a pas le rôle d'enseignant.");
    }
  } catch (error) {
    errors.push("Erreur lors de la vérification de l'enseignant : " + error.message);
  }
}
    // Si des erreurs sont trouvées, renvoyer un message d'erreur
    if (errors.length > 0) {
      return res.status(400).json({
        message: "Erreur(s) de validation.",
        errors
      });
    }

    // Récupérer la matière existante avant la mise à jour
    const matiere = await Matiere.findById(matiereId);
    if (!matiere) {
      return res.status(404).json({ message: "Matière non trouvée." });
    }

    // Sauvegarder les anciennes données
    const ancienneValeurComplete = { ...matiere.toObject() }; //toObject permet de manipuler une copie des données sans affecter l'original.

    // Mettre à jour la matière
    const updatedMatiere = await Matiere.findByIdAndUpdate(matiereId, matiereToUpdate, { new: true });

    // Vérifier les attributs modifiés
    const ancienneValeur = {};
    const nouvelleValeur = {};
    let aucuneModification = true; 

for (const key in matiereToUpdate) {
  if (JSON.stringify(matiereToUpdate[key]) !== JSON.stringify(ancienneValeurComplete[key])) //utiliser JSON.stringify pour une comparaison correcte des objets complexes
    {
    ancienneValeur[key] = ancienneValeurComplete[key]; // Attribut avant modification
    nouvelleValeur[key] = updatedMatiere[key];         // Attribut après modification
    aucuneModification = false;  // Il y a eu une modification
  }
}

// Si aucune modification n'a été effectuée, afficher un message et ne pas sauvegarder dans l'historique
if (aucuneModification) {
  return res.status(200).json({ message: "Aucune modification effectuée." });
}

    // Ajouter une entrée dans l'historique uniquement si des modifications ont eu lieu
    if (Object.keys(ancienneValeur).length > 0) {
      const historiqueEntry = new Historique({
        matiere: updatedMatiere._id,
        action: "Modification",
        ancienneValeur,
        nouvelleValeur,
        utilisateur: req.auth.userId,
        date: new Date(),
      });
      console.log("Champs modifiés:", { ancienneValeur, nouvelleValeur });
      await historiqueEntry.save();
    }

    // Répondre avec la matière mise à jour
    res.status(200).json(updatedMatiere);
  } catch (error) {
    res.status(500).json({ message: error.message });
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

export const deleteMatiere = async (req, res) => {
  try {
    const matiereId = req.params.id;

    // Vérifier si la matière existe
    const matiere = await Matiere.findById(matiereId);
    if (!matiere) {
      return res.status(404).json({ message: "Matière non trouvée." });
      
    }
  

    // Vérifier si la matière a été utilisée 
    const matiereUtilisee = await Matiere.exists({ _id: matiereId, enseignant: { $exists: true, $ne: null} });
    
    console.log("Test matière utilisée :", matiereUtilisee);
     // Vérifier si la matière est déjà archivée
     if (matiere.archived) {
      return res.status(400).json({ message: "Matière déjà archivée." });
    }

    
    if (matiereUtilisee) {
      // Archiver la matière
      matiere.archived = true; 
      await matiere.save();
      return res.status(200).json({ message: "Matière archivée avec succès." });
    }
     
    // Supprimer la matière si elle n'a pas été utilisée
    await Matiere.findByIdAndDelete(matiereId);
    res.status(200).json({ message: "Matière supprimée avec succès." });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
  }
};
