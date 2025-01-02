import Matiere from "../models/matiereModel.js";

import nodemailer from "nodemailer";
import Competence from "../models/competenceModel.js";
import User from "../models/userModel.js";

// Créer une nouvelle matière
export const createMatiere = async (req, res) => {
  try {
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
  const { id } = req.params; // ID de la matière
  const { propositionId } = req.body; // ID de la proposition à valider

  try {
    // Vérifier si la matière existe
    const matiere = await Matiere.findById(id);
    if (!matiere) {
      return res.status(404).json({ message: "Matière non trouvée." });
    }

    // Trouver la proposition dans l'historique
    const proposition = matiere.historiquePropositions.id(propositionId);
    if (!proposition) {
      return res.status(404).json({ message: "Proposition non trouvée." });
    }

    if (proposition.valide) {
      return res
        .status(400)
        .json({ message: "Cette proposition a déjà été validée." });
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
    // Vérifier si l'admin fournit une liste de matières ou notifier toutes
    const { matieresIds } = req.body; // Liste des ID des matières à notifier

    if (!matieresIds || matieresIds.length === 0) {
      return res.status(400).json({ error: "Aucune matière spécifiée." });
    }

    // Récupérer les matières concernées
    const matieres = await Matiere.find({
      _id: { $in: matieresIds },
    });

    if (!matieres || matieres.length === 0) {
      return res.status(404).json({ error: "Matière(s) non trouvée(s)." });
    }

    // Configurer le transporteur SMTP
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 465,
      auth: {
        user: process.env.MAILER_EMAIL_ID, // Votre adresse email
        pass: process.env.MAILER_PASSWORD, // Votre mot de passe
      },
    });

    // Parcourir les matières et envoyer des emails
    for (const matiere of matieres) {
      const etudiants = await User.find({ role: "etudiant" });
      if (!etudiants || etudiants.length === 0) {
        console.log(`Aucun étudiant trouvé pour la matière ${matiere.Nom}`);
        continue;
      }

      // Construire et envoyer un email pour chaque étudiant
      for (const etudiant of etudiants) {
        if (!etudiant.adresseEmail) {
          console.log(
            `Aucun email pour l'étudiant ${etudiant.nom} ${etudiant.prenom}`
          );
          continue;
        }
        const evaluationFormLink = `http://localhost:5000/matieres/${matiere.id}/evaluation`;

        const mailOptions = {
          from: process.env.MAILER_EMAIL_ID,
          to: etudiant.adresseEmail,
          subject: `Invitaion Pour Evaluation`,
          text: `Bonjour ${etudiant.nom},

Vous êtes invité(e) à évaluer la matière "${matiere.Nom}". Veuillez remplir le formulaire d'évaluation via le lien suivant :

${evaluationFormLink}
Cordialement,
L'équipe administratif.`,
        };

        // Envoyer l'email
        await transporter.sendMail(mailOptions);
      }
    }

    res.status(200).json({ message: "Notification envoyée avec succès." });
  } catch (error) {
    console.error("Erreur lors de l'envoi des notifications :", error);
    res
      .status(500)
      .json({ error: "Erreur serveur lors de l'envoi des notifications." });
  }
};

// Ajouter une évaluation
export const addEvaluation = async (req, res) => {
  const { id } = req.params; // ID de la matière
  const etudiant = await User.findOne({ role: "etudiant" });

  const etudiantId = etudiant.id; // ID de l'étudiant connecté
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
    // Trouver la matière
    const matiere = await Matiere.findById(id);
    if (!matiere) {
      return res.status(404).json({ message: "Matière non trouvée." });
    }

    // Vérifier si l'étudiant a déjà évalué cette matière
    if (matiere.etudiantsDejaEvalue.includes(etudiantId)) {
      return res
        .status(400)
        .json({ message: "Vous avez déjà évalué cette matière." });
    }

    // Créer une nouvelle évaluation
    const nouvelleEvaluation = {
      VolumeHoraire,
      MethodesPedagogiques,
      Objectifs,
      CoheranceContenu,
      Satisfaction,
      PertinenceMatiere,
      Remarques,
    };

    // Ajouter l'évaluation anonymement
    matiere.evaluations.push(nouvelleEvaluation);

    // Ajouter l'étudiant à la liste des évaluateurs
    matiere.etudiantsDejaEvalue.push(etudiantId);

    // Sauvegarder la matière
    await matiere.save();

    res.status(201).json({
      message: "Évaluation ajoutée avec succès.",
      evaluation: nouvelleEvaluation,
      dateEvaluation: new Date(Date.now()).toISOString(),
    });
  } catch (error) {
    console.error("Erreur lors de l'ajout de l'évaluation :", error);
    res.status(500).json({ error: error.message });
  }
};

// Obtenir les évaluations d'une matière
export const getEvaluations = async (req, res) => {
  const { id } = req.params; // ID de la matière
  const userRole = req.auth.role; // Rôle de l'utilisateur
  const userId = req.auth.userId; // ID de l'utilisateur

  try {
    // Trouver la matière
    const matiere = await Matiere.findById(id).populate("enseignant");
    if (!matiere) {
      return res.status(404).json({ message: "Matière non trouvée." });
    }
    if (userRole === "admin") {
      return res.status(200).json({ evaluations: matiere.evaluations });
    }
    // Si l'utilisateur est un enseignant, vérifier l'accès
    if (userRole === "enseignant") {
      // Vérifier si l'enseignant est assigné à cette matière
      const enseignant = matiere.enseignant.map((ens) => ens._id.toString());
      if (enseignant.includes(userId)) {
        return res.status(200).json({
          evaluations: matiere.evaluations,
          message: "Accès enseignant",
        });
      } else {
        return res
          .status(403)
          .json({ error: "Vous n'êtes pas autorisé à voir cette matière." });
      }
    }
    // Retourner les évaluations de la matière
    res.status(200).json({
      message: `Évaluations pour la matière : ${matiere.Nom}`,
      evaluations: matiere.evaluations,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des évaluations :", error);
    res.status(500).json({ error: error.message });
  }
};
