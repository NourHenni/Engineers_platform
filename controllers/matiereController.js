import Matiere from "../models/matiereModel.js";
import nodemailer from "nodemailer";
import Competence from "../models/competenceModel.js";
import User from "../models/userModel.js";
import Historique from "../models/historiqueModel.js";
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
      semestre,
      niveau,
      Annee,
      publiee,
    } = req.body;
    // Vérifier si une matière avec le même CodeMatiere existe déjà
    const matiereExiste = await Matiere.findOne({ CodeMatiere });
    if (matiereExiste) {
      return res
        .status(400)
        .json({ error: "Une matière avec ce code existe déjà." });
    }

    // Liste des erreurs
    const errors = [];

    // Validation des attributs spécifiques
    if (!Nom || typeof Nom !== "string" || Nom.trim().length < 3) {
      errors.push(
        "Le nom de la matière est obligatoire et doit contenir au moins 3 caractères."
      );
    }

    if (
      !CodeMatiere ||
      typeof CodeMatiere !== "string" ||
      CodeMatiere.trim().length < 3
    ) {
      errors.push(
        "Le code matière est obligatoire et doit contenir au moins 3 caractères."
      );
    }

    if (Credit !== undefined && (typeof Credit !== "number" || Credit <= 0)) {
      errors.push("Le crédit doit être un nombre positif.");
    }

    if (
      Coefficient !== undefined &&
      (typeof Coefficient !== "number" || Coefficient <= 0)
    ) {
      errors.push("Le coefficient doit être un nombre positif.");
    }

    if (
      VolumeHoraire !== undefined &&
      (typeof VolumeHoraire !== "number" || VolumeHoraire <= 0)
    ) {
      errors.push("Le volume horaire doit être un nombre positif.");
    }

    if (
      NbHeuresCours &&
      (typeof NbHeuresCours !== "number" || NbHeuresCours < 0)
    ) {
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

    if (semestre && !["S1", "S2"].includes(semestre)) {
      errors.push(
        "Semestre doit être l'une des valeurs suivantes : S1, S2"
      );
    }

    if (niveau && !["1", "2", "3"].includes(niveau)) {
      errors.push(
        "Niveau doit être l'une des valeurs suivantes : 1ING, 2ING, 3ING."
      );
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

    if (
      GroupeModule &&
      (typeof GroupeModule !== "string" || GroupeModule.trim() === "")
    ) {
      errors.push("GroupeModule doit être une chaîne de caractères non vide.");
    }

    if (
      CoeffGroupeModule &&
      (typeof CoeffGroupeModule !== "number" || CoeffGroupeModule <= 0)
    ) {
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
      const competencesValides = await Competence.find({
        _id: { $in: competences },
      });
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
    // Mettre à jour les compétences associées
    if (req.body.competences && req.body.competences.length > 0) {
      for (const competenceId of req.body.competences) {
        const competence = await Competence.findById(competenceId);
        if (!competence) {
          console.warn(`Compétence avec l'ID ${competenceId} introuvable.`);
          continue;
        }

        // Ajouter l'ID de la matière à la liste des matières de la compétence
        if (!competence.matieres.includes(matiere._id)) {
          competence.matieres.push(matiere._id);
          await competence.save(); // Sauvegarder la mise à jour
        }
      }
    }

    res.status(201).json(matiere);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMatieres = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const userRole = req.auth.role;

    let matieres;
    let query = {};

    if (userRole === "admin") {
          matieres = await Matiere.find().populate("competences");
    } else if (userRole === "enseignant") {
      // Enseignant voit les matières qui lui sont assignées
      matieres = await Matiere.find({ enseignant: userId }).populate(
        "competences"
      );


    }else if (userRole === "etudiant") { 
      const utilisateur = await User.findById(userId);
      
      if (!utilisateur) {
        console.log("[DEBUG] Étudiant non trouvé ID:", userId); // Log
        return res.status(404).json({ message: "Étudiant introuvable." });
      }

      // Vérification renforcée
      if (!utilisateur.niveau || !utilisateur.semestre) {
        console.log("[DEBUG] Données manquantes:", { // Log
          niveau: utilisateur.niveau, 
          semestre: utilisateur.semestre
        });
        return res.status(400).json({ 
          message: "Profil étudiant incomplet (niveau/semestre manquant). Contactez l'administration." 
        });
      }

      query = { 
        publiee: true,
        niveau: utilisateur.niveau,
        semestre: utilisateur.semestre 
      };
      matieres = await Matiere.find(query)
        .populate("competences enseignant");


    } else {
      return res.status(403).json({ 
        message: "Accès refusé : Rôle non autorisé." 
      });
    }

    if (!matieres || matieres.length === 0) {


      return res.status(404).json({ message: "Aucune matière trouvée." });

    }

    res.status(200).json(matieres);
  } catch (error) {
    res.status(500).json({ 
      error: "Erreur serveur : " + error.message 
    });
  }
};
export const getMatiereDetail = async (req, res) => {
  try {
    const matiereId = req.params.id;
    const userRole = req.auth.role;

    let matiere;
    if (userRole === "admin") {
      matiere = await Matiere.findById(matiereId)
        .populate("competences")
        .populate("historiquePropositions.enseignant", "nom prenom");
    } else {
      matiere = await Matiere.findOne({
        _id: matiereId,
        publiee: true,
      }).populate("competences");
    }

    if (!matiere) {
      return res.status(404).json({
        message:
          userRole === "admin"
            ? "Matière introuvable."
            : "Matière non publiée ou introuvable.",
      });
    }

    // Récupérer l'historique
    const historique = await Historique.find({ matiere: matiereId })
      .populate("utilisateur", "nom prenom role")
      .sort({ date: -1 });

    res.status(200).json({
      ...matiere.toObject(),
      historique,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
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
      "GroupeModule",
      "CoeffGroupeModule",
      "CodeMatiere",
      "Nom",
      "Credit",
      "Coefficient",
      "VolumeHoraire",
      "NbHeuresCours",
      "NbHeuresTD",
      "NbHeuresTP",
      "Curriculum",
      "Annee",
      "archived",
      "semestre",
      "niveau",
      "publiee",
      "competences",
      "enseignant",
    ];
    // Valider les attributs de la requête
    const attributsInvalides = Object.keys(matiereToUpdate).filter(
      (key) => !attributsAutorises.includes(key)
    );
    if (attributsInvalides.length > 0) {
      return res.status(400).json({
        message: `Les attributs suivants ne sont pas valides : ${attributsInvalides.join(
          ", "
        )}`,
      });
    }
    // Vérifier si un attribut est vide ou indéfini
    const attributsVides = Object.keys(matiereToUpdate).filter(
      (key) =>
        matiereToUpdate[key] === undefined ||
        matiereToUpdate[key] === null ||
        matiereToUpdate[key] === ""
    );
    if (attributsVides.length > 0) {
      return res.status(400).json({
        message: `Le(s) champ(s) suivant(s) est (sont) vide(s) : ${attributsVides.join(
          ", "
        )}`,
      });
    }

    // Liste des erreurs
    const errors = [];

    // Valider chaque attribut
    if (
      matiereToUpdate.GroupeModule &&
      (typeof matiereToUpdate.GroupeModule !== "string" ||
        matiereToUpdate.GroupeModule.trim() === "")
    ) {
      errors.push("GroupeModule doit être une chaîne de caractères non vide.");
    }

    if (
      matiereToUpdate.CoeffGroupeModule &&
      (typeof matiereToUpdate.CoeffGroupeModule !== "number" ||
        matiereToUpdate.CoeffGroupeModule <= 0)
    ) {
      errors.push("CoeffGroupeModule doit être un nombre positif.");
    }

    if (
      matiereToUpdate.CodeMatiere &&
      (typeof matiereToUpdate.CodeMatiere !== "string" ||
        matiereToUpdate.CodeMatiere.length < 3)
    ) {
      errors.push(
        "CodeMatiere doit être une chaîne de caractères de 3 caractères minimum."
      );
    }

    if (
      matiereToUpdate.Nom &&
      (typeof matiereToUpdate.Nom !== "string" ||
        matiereToUpdate.Nom.trim().length < 3)
    ) {
      errors.push(
        "Nom doit être une chaîne de caractères de 3 caractères minimum."
      );
    }

    if (
      matiereToUpdate.Credit &&
      (typeof matiereToUpdate.Credit !== "number" ||
        matiereToUpdate.Credit <= 0)
    ) {
      errors.push("Credit doit être un nombre positif.");
    }

    if (
      matiereToUpdate.Coefficient &&
      (typeof matiereToUpdate.Coefficient !== "number" ||
        matiereToUpdate.Coefficient <= 0)
    ) {
      errors.push("Coefficient doit être un nombre positif.");
    }

    if (
      matiereToUpdate.VolumeHoraire &&
      (typeof matiereToUpdate.VolumeHoraire !== "number" ||
        matiereToUpdate.VolumeHoraire <= 0)
    ) {
      errors.push("VolumeHoraire doit être un nombre positif.");
    }

    if (
      matiereToUpdate.NbHeuresCours &&
      (typeof matiereToUpdate.NbHeuresCours !== "number" ||
        matiereToUpdate.NbHeuresCours < 0)
    ) {
      errors.push("NbHeuresCours doit être un nombre non négatif.");
    }

    if (
      matiereToUpdate.NbHeuresTD &&
      (typeof matiereToUpdate.NbHeuresTD !== "number" ||
        matiereToUpdate.NbHeuresTD < 0)
    ) {
      errors.push("NbHeuresTD doit être un nombre non négatif.");
    }

    if (
      matiereToUpdate.NbHeuresTP &&
      (typeof matiereToUpdate.NbHeuresTP !== "number" ||
        matiereToUpdate.NbHeuresTP < 0)
    ) {
      errors.push("NbHeuresTP doit être un nombre non négatif.");
    }

    if (
      matiereToUpdate.Curriculum &&
      !Array.isArray(matiereToUpdate.Curriculum)
    ) {
      errors.push("Curriculum doit être un tableau.");
    }

    if (
      matiereToUpdate.semestre &&
      !["S1", "S2"].includes(matiereToUpdate.semestre)
    ) {
      errors.push(
        "Semestre doit être l'une des valeurs suivantes : S1, S2"
      );
    }

    if (
      matiereToUpdate.niveau &&
      !["1", "2", "3"].includes(matiereToUpdate.niveau)
    ) {
      errors.push(
        "Niveau doit être l'une des valeurs suivantes : 1ING, 2ING, 3ING."
      );
    }

    if (
      matiereToUpdate.Annee &&
      (typeof matiereToUpdate.Annee !== "number" ||
        matiereToUpdate.Annee < 2000 ||
        matiereToUpdate.Annee > 3000)
    ) {
      errors.push("Annee doit être une année valide entre 2000 et 3000.");
    }

    if (
      matiereToUpdate.publiee &&
      typeof matiereToUpdate.publiee !== "boolean"
    ) {
      errors.push("publiee doit être un booléen.");
    }

    if (
      matiereToUpdate.competences &&
      !Array.isArray(matiereToUpdate.competences)
    ) {
      errors.push("competences doit être un tableau.");
    }

    // Vérification de l'existence de l'enseignant dans la base de données
    if (matiereToUpdate.enseignant) {
      try {
        // Vérifie si l'enseignant existe et s'il a le rôle "enseignant"
        const enseignantExiste = await User.findById(
          matiereToUpdate.enseignant
        );

        if (!enseignantExiste) {
          errors.push(
            "L'enseignant spécifié n'existe pas dans la base de données."
          );
        } else if (enseignantExiste.role !== "enseignant") {
          errors.push("L'utilisateur spécifié n'a pas le rôle d'enseignant.");
        }
      } catch (error) {
        errors.push(
          "Erreur lors de la vérification de l'enseignant : " + error.message
        );
      }
    }
    // Si des erreurs sont trouvées, renvoyer un message d'erreur
    if (errors.length > 0) {
      return res.status(400).json({
        message: "Erreur(s) de validation.",
        errors,
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
       const updatedMatiere = await Matiere.findByIdAndUpdate(
      matiereId,
      matiereToUpdate,
      { new: true }
    );

    // Vérifier les attributs modifiés
    const ancienneValeur = {};
    const nouvelleValeur = {};
    let aucuneModification = true;

    for (const key in matiereToUpdate) {
      if (
        JSON.stringify(matiereToUpdate[key]) !==
        JSON.stringify(ancienneValeurComplete[key])
      ) {
        //utiliser JSON.stringify pour une comparaison correcte des objets complexes
        ancienneValeur[key] = ancienneValeurComplete[key]; // Attribut avant modification
        nouvelleValeur[key] = updatedMatiere[key]; // Attribut après modification
        aucuneModification = false; // Il y a eu une modification
      }
    }

    // Si aucune modification n'a été effectuée, afficher un message et ne pas sauvegarder dans l'historique
    if (aucuneModification) {
      return res
        .status(200)
        .json({ message: "Aucune modification effectuée." });
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
    const matiereUtilisee = await Matiere.exists({
      _id: matiereId,
      enseignant: { $exists: true, $ne: null },
    });

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
      user: process.env.MAILER_EMAIL_ID,
      pass: process.env.MAILER_PASSWORD,
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

function updateChapitreStatus(chapitre) {
  // 1. Vérification que le chapitre a des sections
  if (!chapitre.sections || !Array.isArray(chapitre.sections)) {
    chapitre.AvancementChap = "NonCommencee";
    chapitre.dateFinChap = undefined;
    return;
  }

  const sections = chapitre.sections;

  // 2. Si toutes les sections sont terminées
  if (sections.every((s) => s.AvancementSection === "Terminee")) {
    chapitre.AvancementChap = "Terminee";
    chapitre.dateFinChap = new Date();
  }
  // 3. Si au moins une section est en cours
  else if (sections.some((s) => s.AvancementSection === "EnCours")) {
    chapitre.AvancementChap = "EnCours";
    chapitre.dateFinChap = undefined;
  }
  // 4. Cas par défaut (non commencé)
  else {
    chapitre.AvancementChap = "NonCommencee";
    chapitre.dateFinChap = undefined;
  }
}

// Fonction helper pour mettre à jour le statut du chapitre

// Fonction pour envoyer les notifications
async function sendNotifications(
  matiere,
  chapitreIndex,
  sectionIndex,
  nouveauStatut
) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 465,
      auth: {
        user: process.env.MAILER_EMAIL_ID,
        pass: process.env.MAILER_PASSWORD,
      },
    });

    const chapitre = matiere.Curriculum[chapitreIndex];
    const section = chapitre.sections[sectionIndex];

    // Notification à l'admin
    const admin = await User.findOne({ role: "admin" });
    if (admin && admin.adresseEmail) {
      await transporter.sendMail({
        from: process.env.MAILER_EMAIL_ID,
        to: admin.adresseEmail,
        subject: `Mise à jour - ${matiere.Nom}`,
        text: `La section "${section.nomSection}" (${nouveauStatut}) a été mise à jour.`,
      });
    }

    // Notifications aux étudiants
    const etudiants = await User.find({
      role: "etudiant",
      matieres: matiere._id,
    });

    for (const etudiant of etudiants) {
      if (etudiant.adresseEmail) {
        await transporter.sendMail({
          from: process.env.MAILER_EMAIL_ID,
          to: etudiant.adresseEmail,
          subject: `Avancement - ${matiere.Nom}`,
          text: `La section "${section.nomSection}" est maintenant "${nouveauStatut}".`,
        });
      }
    }
  } catch (error) {
    console.error("Erreur lors de l'envoi des notifications:", error);
    // Ne pas bloquer le processus principal pour une erreur de notification
  }
}

export const updateCurriculum = async (req, res) => {
  try {
    const matiere = await Matiere.findById(req.params.id);

    if (!matiere) {
      return res.status(404).json({ message: "Matière non trouvée." });
    }

    // Vérifier si l'utilisateur est l'enseignant assigné ou admin
    if (
      req.auth.role === "enseignant" &&
      (!matiere.enseignant || matiere.enseignant.toString() !== req.auth.userId)
    ) {
      return res.status(403).json({ message: "Action non autorisée." });
    }

    // Validation du curriculum
    if (!Array.isArray(req.body.Curriculum)) {
      return res.status(400).json({ error: "Format de curriculum invalide." });
    }

    // Valider chaque chapitre et section
    const validatedCurriculum = req.body.Curriculum.map((chapitre) => {
      return {
        titreChapitre: chapitre.titreChapitre || "Sans titre",
        AvancementChap: chapitre.AvancementChap || "NonCommencee",
        sections: (chapitre.sections || []).map((section) => {
          return {
            nomSection: section.nomSection || "Sans titre",
            Description: section.Description || "",
            AvancementSection: section.AvancementSection || "NonCommencee",
            dateFinSection:
              section.AvancementSection === "Terminee" ? new Date() : null,
          };
        }),
      };
    });

    // Mettre à jour seulement le curriculum
    const updated = await Matiere.findByIdAndUpdate(
      req.params.id,
      { Curriculum: validatedCurriculum },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const proposeModification = async (req, res) => {
  const { id } = req.params; // Récupère l'ID de la matière depuis l'URL
  const { contenu, raison } = req.body; // Récupère les données envoyées dans la requête
  const userId = req.auth.userId; // Récupère l'ID de l'utilisateur connecté

  try {
    // Vérifier l'existence de la matière
    const matiere = await Matiere.findById(id);

    if (!matiere) {
      return res.status(404).json({ message: "Matière non trouvée." }); // Si l'ID est invalide
    }
    // Vérifier si l'utilisateur connecté est bien assigné à cette matière
    if (!matiere.enseignant || matiere.enseignant.toString() !== userId) {
      return res.status(403).json({
        message:
          "Vous n'êtes pas autorisé à proposer une modification pour cette matière.",
      });
    }

    // Exclure le titre et les compétences du contenu
    const contenuSansNomCompetences = { ...contenu };
    delete contenuSansNomCompetences.nom;
    delete contenuSansNomCompetences.competences;

    const teacher = await User.findOne({ role: "enseignant" });

    // Créer une nouvelle proposition avec le contenu modifié
    const nouvelleProposition = {
      contenu: contenuSansNomCompetences, // Les nouvelles données sans nom et compétences
      raison, // La raison du changement
      enseignant: userId,
      valide: false,
      dateProposition: new Date(Date.now()).toISOString(), // Date.now() renvoie un timestamp en millisecondes
    };

    // Ajouter la proposition à l'historique des propositions
    matiere.historiquePropositions.push(nouvelleProposition);
    // Sauvegarder la matière avec la nouvelle proposition
    await matiere.save();

    // Répondre avec succès et renvoyer la nouvelle proposition
    res.status(201).json({
      message: "Proposition ajoutée avec succès.",
      proposition: nouvelleProposition,
    });
  } catch (error) {
    console.error("Erreur lors de la proposition de modification :", error); // Log en cas d'erreur
    res.status(500).json({ error: error.message }); // Répondre avec une erreur 500
  }
};

export const validateModification = async (req, res) => {
  const { id } = req.params;
  const { propositionId } = req.body;

  try {
    const matiere = await Matiere.findById(id)
      .populate("competences")
      .populate("historiquePropositions.enseignant", "nom prenom email");
    if (!matiere) {
      return res.status(404).json({ message: "Matière non trouvée." });
    }

    const proposition = matiere.historiquePropositions.id(propositionId);

    if (!proposition) {
      return res.status(404).json({ message: "Proposition non trouvée." });
    }

    if (proposition.valide) {
      return res.status(400).json({
        error: "Cette proposition a déjà été validée.",
      });
    }

    // Comparer le contenu actuel avec le contenu proposé pour identifier les champs modifiés
    const modifications = {};
    for (const key in proposition.contenu) {
      if (matiere[key] !== proposition.contenu[key]) {
        modifications[key] = {
          ancien: matiere[key],
          nouveau: proposition.contenu[key],
        };
      }
    }

    // Ajouter l'ancien contenu de la matière à l'historique
    matiere.historiqueModifications.push({
      contenu: modifications,
    });

    // Mettre à jour la matière avec le contenu validé
    Object.assign(matiere, proposition.contenu);

    // Marquer la proposition comme validée
    proposition.valide = true;

    // Sauvegarder la matière avec les modifications
    await matiere.save();

    res.status(200).json({
      message: "Proposition validée avec succès, contenu mis à jour.",
      contenu: modifications,
    });
  } catch (error) {
    console.error("Erreur lors de la validation :", error);
    res.status(500).json({ error: error.message });
  }
};

export const EnvoiEmailEvaluation = async (req, res) => {
  try {
    const { matieresIds } = req.body;

    if (!matieresIds || !Array.isArray(matieresIds)) {
      return res.status(400).json({ error: "Liste de matières invalide." });
    }

    const matieres = await Matiere.find({ _id: { $in: matieresIds } });
    if (matieres.length === 0) {
      return res.status(404).json({ error: "Aucune matière trouvée." });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAILER_EMAIL_ID,
        pass: process.env.MAILER_PASSWORD,
      },
    });

    const etudiants = await User.find({ role: "etudiant" });

    for (const etudiant of etudiants) {
      if (!etudiant.adresseEmail) continue;

      try {
        await transporter.sendMail({
          from: process.env.MAILER_EMAIL_ID,
          to: etudiant.adresseEmail,
          subject: "Évaluation des matières",
          html: `
            <h3>Cher(e) ${etudiant.nom},</h3>
            <p>Vous êtes invité à évaluer les matières suivantes :</p>
            <ul>
              ${matieres
                .map(
                  (m) =>
                    `<li>
                  ${m.Nom} - 
                  <a href="${process.env.FRONTEND_URL}/matieres/${m._id}/evaluation">
                    Formulaire d'évaluation
                  </a>
                </li>`
                )
                .join("")}
            </ul>
            <p>Cordialement,<br/>L'équipe pédagogique</p>
          `,
        });
      } catch (emailError) {
        console.error("Erreur d'envoi email:", emailError);
      }
    }

    res.status(200).json({ message: "Notifications envoyées avec succès." });
  } catch (error) {
    console.error("Erreur EnvoiEmailEvaluation:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

export const addEvaluation = async (req, res) => {
  const { id } = req.params;
  const etudiantId = req.auth.userId; // ID de l'étudiant connecté

  const {
    VolumeHoraire,
    MethodesPedagogiques,
    Objectifs,
    CoheranceContenu,
    Satisfaction,
    PertinenceMatiere,
    Remarques,
  } = req.body;

  try {
    // Vérifier si la matière existe
    const matiere = await Matiere.findById(id);
    if (!matiere) {
      return res.status(404).json({ message: "Matière non trouvée." });
    }

    // Vérifier si l'étudiant a déjà évalué cette matière
    if (matiere.etudiantsDejaEvalue.includes(etudiantId)) {
      return res.status(400).json({
        message: "Vous avez déjà évalué cette matière.",
      });
    }

    // Créer la nouvelle évaluation
    const nouvelleEvaluation = {
      VolumeHoraire,
      MethodesPedagogiques,
      Objectifs,
      CoheranceContenu,
      Satisfaction,
      PertinenceMatiere,
      Remarques,
      dateEvaluation: new Date(),
    };

    // Ajouter l'évaluation et marquer l'étudiant
    matiere.evaluations.push(nouvelleEvaluation);
    matiere.etudiantsDejaEvalue.push(etudiantId);

    // Sauvegarder
    await matiere.save();

    res.status(201).json({
      message: "Évaluation enregistrée avec succès.",
      evaluation: nouvelleEvaluation,
    });
  } catch (error) {
    console.error("Erreur lors de l'ajout de l'évaluation:", error);
    res.status(500).json({
      error: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// Fonction pour récupérer les évaluations
export const getEvaluations = async (req, res) => {
  const { id } = req.params;
  const userRole = req.auth.role;
  const userId = req.auth.userId;

  try {
    // Récupérer la matière avec les évaluations et les étudiants
    const matiere = await Matiere.findById(id)
      .populate("enseignant", "nom prenom email")
      .populate("etudiantsDejaEvalue", "nom prenom");

    if (!matiere) {
      return res.status(404).json({ message: "Matière non trouvée." });
    }

    // Vérifier les permissions
    if (userRole === "admin") {
      // Admin peut tout voir
      return res.status(200).json({
        matiere: {
          _id: matiere._id,
          Nom: matiere.Nom,
          CodeMatiere: matiere.CodeMatiere,
          Enseignant: matiere.enseignant,
        },
        evaluations: matiere.evaluations,
        etudiantsEvaluateurs: matiere.etudiantsDejaEvalue,
        nombreEvaluations: matiere.evaluations.length,
      });
    } else if (userRole === "enseignant") {
      // Enseignant ne voit que ses matières
      if (matiere.enseignant._id.toString() !== userId) {
        return res.status(403).json({
          message: "Accès refusé: vous n'enseignez pas cette matière.",
        });
      }

      return res.status(200).json({
        matiere: {
          _id: matiere._id,
          Nom: matiere.Nom,
          CodeMatiere: matiere.CodeMatiere,
        },
        evaluations: matiere.evaluations,
        nombreEvaluations: matiere.evaluations.length,
      });
    } else {
      return res.status(403).json({ message: "Accès refusé." });
    }
  } catch (error) {
    console.error("Erreur lors de la récupération des évaluations:", error);
    res.status(500).json({
      error: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};


