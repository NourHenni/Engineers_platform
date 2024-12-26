import StageEte from "../models/stageEteModel.js";
import User from "../models/userModel.js";
import Matiere from "../models/matiereModel.js";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import SoutenanceStageEte from "../models/soutenanceStageEteModel.js";
import moment from "moment";
import periodeModel from "../models/periodeModel.js";

import dotenv from "dotenv";
import competenceModel from "../models/competenceModel.js";

// Load environment variables from .env file
dotenv.config();

//ajouter periode

export const addPeriod = async (req, res) => {
  try {
    const { niveau } = req.params;
    const currentDate = moment().utc().startOf("day");
    const start_date = moment(req.body.DateDebutDepot + "T00:00:00Z").utc();
    const end_date = moment(req.body.DateFinDepot + "T23:59:59Z").utc();
    if (end_date.isBefore(currentDate) || end_date.isBefore(start_date)) {
      res.status(400).json({
        success: false,
        message: "Date Invalide",
      });
    } else {
      const period = new periodeModel({
        Nom: req.body.Nom,
        Date_Debut_depot: start_date,
        Date_Fin_depot: end_date,
        type: req.body.type,
        niveau: niveau,
      });
      const foundPeriodType = await periodeModel.findOne({
        niveau: period.niveau,
      });
      if (!foundPeriodType) {
        if (start_date.isAfter(currentDate, "day")) {
          period.PeriodState = "Not started yet";
        } else if (
          start_date.isSame(currentDate, "day") ||
          start_date.isBefore(currentDate, "day")
        ) {
          period.PeriodState = "In progress";
        }
        if (
          period.PeriodState == "In progress" ||
          period.PeriodState == "Not started yet"
        ) {
          await period.save();
          res.status(200).send({ message: "période crée avec succés" });
        }
      } else {
        res.status(400).send({
          message: "Une periode avec ce type éxiste deja ",
        });
      }
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// Récupérer toutes les périodes depuis la base de données

export const getAllPeriods = async (req, res) => {
  try {
    const validTypes = ["premiereannee", "deuxiemeannee"];
    const { niveau } = req.params;

    // Vérifiez si le type est valide
    if (!validTypes.includes(niveau)) {
      return res.status(400).json({
        success: false,
        message: "Type de niveau invalide.",
      });
    }
    // Récupérer toutes les périodes depuis la base de données
    const periodes = await periodeModel.find({ niveau: niveau });

    // Vérifier si des périodes existent
    if (!periodes || periodes.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Aucune période trouvée.",
      });
    }

    // Retourner les périodes
    res.status(200).json({
      success: true,
      message: "Périodes récupérées avec succès.",
      periodes,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des périodes:",
      error.message
    );
    res.status(500).json({
      success: false,
      message: "Erreur serveur. Réessayez plus tard.",
      error: error.message,
    });
  }
};

//mise a jour

export const updatePeriod = async (req, res) => {
  try {
    const { dateDebut, dateFin } = req.body;
    const { niveau } = req.params;
    // Vérification des champs obligatoires
    if (!dateDebut || !dateFin) {
      return res.status(400).json({
        success: false,
        message: "Les champs 'dateDebut' et 'dateFin' sont obligatoires.",
      });
    }

    // Recherche de la période spécifique (exemple : "Summer Internship")
    const periode = await periodeModel.findOne({ niveau: niveau });

    if (!periode) {
      return res.status(404).json({
        success: false,
        message: "Période introuvable.",
      });
    }

    // Validation des nouvelles dates
    const now = new Date();
    const newDateDebut = new Date(dateDebut);
    const newDateFin = new Date(dateFin);

    if (newDateDebut >= newDateFin) {
      return res.status(400).json({
        success: false,
        message: "La date de début doit être antérieure à la date de fin.",
      });
    }

    if (newDateFin < now) {
      return res.status(400).json({
        success: false,
        message:
          "La date de fin doit être supérieure ou égale à la date actuelle.",
      });
    }

    // Mise à jour des dates
    periode.Date_Debut_depot = newDateDebut;
    periode.Date_Fin_depot = newDateFin;

    // Mise à jour de l'état (PeriodState) en fonction des nouvelles dates
    if (newDateDebut > now) {
      periode.PeriodState = "Not started yet";
    } else if (newDateFin >= now && newDateDebut <= now) {
      periode.PeriodState = "In progress";
    } else if (newDateFin < now) {
      periode.PeriodState = "Finished";
    }

    // Enregistrement des modifications
    await periode.save();

    res.status(200).json({
      success: true,
      message: "Les délais ont été mis à jour avec succès.",
      periode,
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour des délais :", error.message);
    res.status(500).json({
      success: false,
      message: "Erreur serveur. Veuillez réessayer plus tard.",
      error: error.message,
    });
  }
};

// Contrôleur pour déposer un sujet avec documents

export const postInternship = async (req, res) => {
  try {
    const { type } = req.params;
    const {
      titreSujet,
      nomEntreprise,
      dateDebut,
      dateFin,
      description,
      natureSujet,
      niveau,
      anneeStage,
    } = req.body;

    // Vérification du type (niveau)
    const niveauValide = type === "premiereannee" || type === "deuxiemeannee";

    if (!niveauValide) {
      return res.status(400).json({
        success: false,
        message:
          "Type invalide. Seuls les niveaux 'premiereannee' ou 'deuxiemeannee' sont autorisés.",
      });
    }

    // Vérification des champs obligatoires
    if (
      !titreSujet ||
      !nomEntreprise ||
      !dateDebut ||
      !dateFin ||
      !anneeStage ||
      !niveau ||
      !description ||
      !natureSujet
    ) {
      return res.status(400).json({
        success: false,
        message: "Tous les champs obligatoires doivent être remplis.",
      });
    }

    // Vérification des fichiers
    const rapport = req.files.rapport ? req.files.rapport[0].path : null;
    const attestation = req.files.attestation
      ? req.files.attestation[0].path
      : null;
    const ficheEvaluation = req.files.ficheEvaluation
      ? req.files.ficheEvaluation[0].path
      : null;

    if (!rapport || !attestation || !ficheEvaluation) {
      return res.status(400).json({
        success: false,
        message:
          "Tous les documents (rapport, attestation, fiche d'évaluation) doivent être fournis.",
      });
    }

    // Récupération de l'ID de l'étudiant à partir du token
    const etudiantId = req.auth.userId;

    // Vérification du nombre total de sujets déposés par l'étudiant
    const totalSujets = await StageEte.countDocuments({ etudiant: etudiantId });
    if (totalSujets >= 2) {
      return res.status(400).json({
        success: false,
        message: "Vous ne pouvez pas déposer plus de deux sujets.",
      });
    }

    // Vérification du nombre de sujets pour le même niveau
    const sujetsMemeNiveau = await StageEte.countDocuments({
      etudiant: etudiantId,
      niveau: type, // Utilisation de `type` validé comme niveau
    });
    if (sujetsMemeNiveau > 0) {
      return res.status(400).json({
        success: false,
        message: `Vous avez déjà déposé un sujet pour le niveau ${type}.`,
      });
    }

    if (niveau === type) {
      // Création du stage
      const newStage = new StageEte({
        titreSujet,
        nomEntreprise,
        dateDebut,
        dateFin,
        niveau: type, // Associe le niveau validé
        description,
        anneeStage,
        statutSujet: "Non valide",
        statutDepot: "Depose",
        etudiant: req.auth.userId,
        natureSujet,
        rapport,
        attestation,
        ficheEvaluation, // Stockage des chemins des fichiers
      });

      // Vérification de la période de dépôt
      const currentDate = moment().utc().startOf("day");

      const activePeriod = await periodeModel.findOne({
        type: "Summer Internship", // Assurez-vous que le type est correct
        PeriodState: "In progress",
      });

      if (!activePeriod) {
        return res.status(400).json({
          success: false,
          message: "Aucune période active pour le dépôt des stages.",
        });
      }

      const end_date = moment(activePeriod.Date_Fin_depot);
      if (currentDate.isAfter(end_date)) {
        newStage.statutDepot = "Depose avec retard";

        res.status(201).json({
          success: true,
          message: "La date limite de dépôt des sujets est dépassée",
        });
      }

      const savedStage = await newStage.save();

      res.status(201).json({
        success: true,
        message: "Sujet de stage déposé avec succès.",
        stage: savedStage,
      });
    } else {
      res.status(400).json({
        success: true,
        message: "erreur",
      });
    }
  } catch (error) {
    console.error("Erreur lors du dépôt:", error.message);
    res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors du dépôt du sujet.",
      error: error.message,
    });
  }
};

export const getInternshipsByType = async (req, res) => {
  const { type } = req.params;

  try {
    // Récupérer tous les stages pour un niveau donné
    const stages = await StageEte.find({ niveau: type })
      .populate("etudiant", "nom prenom adresseEmail role")
      .populate("enseignant", "nom prenom adresseEmail")
      .populate("soutenance", "horaire jour lien");
    if (!stages || stages.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Aucun stage trouvé pour le niveau : ${type}`,
      });
    }

    // Structurer les résultats
    const result = stages.map((stage) => ({
      etudiant: {
        nom: stage.etudiant.nom,
        prenom: stage.etudiant.prenom,
        email: stage.etudiant.adresseEmail,
      },
      enseignant: stage.enseignant
        ? {
            nom: stage.enseignant.nom,
            prenom: stage.enseignant.prenom,
            email: stage.enseignant.adresseEmail,
          }
        : null,
      stage: {
        titreSujet: stage.titreSujet,
        nomEntreprise: stage.nomEntreprise,
        dateDebut: stage.dateDebut,
        dateFin: stage.dateFin,
        description: stage.description,
        natureSujet: stage.natureSujet,
        statutSujet: stage.statutSujet,
        statutDepot: stage.statutDepot,
        fichiers: {
          rapport: stage.rapport,
          attestation: stage.attestation,
          ficheEvaluation: stage.ficheEvaluation,
        },
        planningPublie: stage.planningPublie,
      },
      soutenance: stage.soutenance
        ? {
            horaire: stage.soutenance.horaire,
            jour: stage.soutenance.jour,
            lien: stage.soutenance.lien,
          }
        : null, // Si aucune soutenance n'est affectée
    }));

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Erreur :", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des stages.",
      error: error.message,
    });
  }
};
export const getStageDetails = async (req, res) => {
  try {
    const { type, id } = req.params; // Récupération des paramètres

    // Rechercher le stage par ID et niveau
    const stage = await StageEte.findOne({ _id: id, niveau: type })
      .populate("etudiant", "nom prenom adresseEmail cin role")
      .populate("enseignant", "nom adresseEmail")
      .populate("soutenance", "horaire jour lien");

    // Vérifier si le stage existe
    if (!stage) {
      return res.status(404).json({
        success: false,
        message: "Stage introuvable pour cet ID et ce niveau.",
      });
    }
    // Structurer les résultats pour l'affichage
    const result = {
      etudiant: {
        nom: stage.etudiant.nom,
        prenom: stage.etudiant.prenom,
        email: stage.etudiant.adresseEmail,
        cin: stage.etudiant.cin,
      },
      enseignant: stage.enseignant
        ? {
            nom: stage.enseignant.nom,
            email: stage.enseignant.adresseEmail,
          }
        : null,
      stage: {
        titreSujet: stage.titreSujet,
        nomEntreprise: stage.nomEntreprise,
        dateDebut: stage.dateDebut,
        dateFin: stage.dateFin,
        description: stage.description,
        natureSujet: stage.natureSujet,
        statutSujet: stage.statutSujet,
        statutDepot: stage.statutDepot,
        fichiers: {
          rapport: stage.rapport,
          attestation: stage.attestation,
          ficheEvaluation: stage.ficheEvaluation,
        },
        planningPublie: stage.planningPublie,
      },
      soutenance: stage.soutenance
        ? {
            horaire: stage.soutenance.horaire,
            jour: stage.soutenance.jour,
            lien: stage.soutenance.lien,
          }
        : null, // Si aucune soutenance n'est affectée
    };

    // Réponse avec les détails du stage
    res.status(200).json({
      success: true,
      message: "Détails du stage récupérés avec succès.",
      data: stage,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la récupération du stage.",
      error: error.message,
    });
  }
};

export const getEnseignants = async (req, res) => {
  try {
    const users = await User.find({ role: "enseignant" });
    res.status(200).json({
      model: users,
      message: "success",
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

export const assignTeachersToStages = async (req, res) => {
  try {
    const { type } = req.params; // Niveau (type)
    const { teacherIds } = req.body; // Liste des enseignants sélectionnés

    if (!teacherIds || teacherIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Liste des enseignants non fournie.",
      });
    }

    // Récupérer les enseignants sélectionnés
    const teachers = await User.find({
      _id: { $in: teacherIds },
      role: "enseignant",
    }).lean();

    if (teachers.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Aucun enseignant valide trouvé." });
    }

    // Récupérer les matières enseignées par chaque enseignant
    const teacherMatieres = await Matiere.aggregate([
      {
        $match: {
          enseignant: {
            $in: teacherIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
        },
      },
      { $group: { _id: "$enseignant", totalMatieres: { $sum: 1 } } },
    ]);

    // Associer les enseignants à leurs nombres de matières
    const teacherWeights = teachers.map((teacher) => {
      const matiereInfo = teacherMatieres.find(
        (m) => m._id.toString() === teacher._id.toString()
      );
      return {
        ...teacher,
        totalMatieres: matiereInfo ? matiereInfo.totalMatieres : 0,
      };
    });

    // Vérifier qu'au moins un enseignant a des matières associées
    const totalMatieres = teacherWeights.reduce(
      (sum, t) => sum + t.totalMatieres,
      0
    );
    if (totalMatieres === 0) {
      return res.status(400).json({
        success: false,
        message: "Aucun enseignant avec des matières trouvées.",
      });
    }

    // Récupérer les stages non validés pour le niveau (type)
    const stages = await StageEte.find({
      niveau: type,
      statutSujet: "Non valide",
    });
    if (stages.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Aucun stage à assigner pour ce niveau.",
      });
    }

    // Calculer le coefficient de répartition
    const coefficient = Math.floor(stages.length / totalMatieres);

    // Distribution des stages proportionnelle
    let assignedStages = [];
    let stageIndex = 0;

    teacherWeights.forEach((teacher) => {
      const numStages = teacher.totalMatieres * coefficient;
      for (let i = 0; i < numStages && stageIndex < stages.length; i++) {
        stages[stageIndex].enseignant = teacher._id; // Assigner l'enseignant au stage
        assignedStages.push(stages[stageIndex]);
        stageIndex++;
      }
    });

    // Assigner les stages restants
    while (stageIndex < stages.length) {
      const teacher = teacherWeights[stageIndex % teacherWeights.length];
      stages[stageIndex].enseignant = teacher._id;
      assignedStages.push(stages[stageIndex]);
      stageIndex++;
    }

    // Sauvegarder les changements
    await Promise.all(assignedStages.map((stage) => stage.save()));

    res.status(200).json({
      success: true,
      message: "Stages assignés avec succès.",
      assignedStages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'assignation des stages.",
      error: error.message,
    });
  }
};

export const updateAssignedTeacher = async (req, res) => {
  try {
    const { type } = req.params; // Récupérer le niveau (type) depuis les paramètres
    const { stageId, teacherId } = req.body; // Récupérer les données du corps de la requête

    // Vérifier que les données nécessaires sont présentes
    if (!stageId || !teacherId) {
      return res.status(400).json({
        success: false,
        message: "Les champs 'stageId' et 'teacherId' sont requis.",
      });
    }

    // Vérifier si le stage existe et correspond au niveau (type)
    const stage = await StageEte.findOne({ _id: stageId, niveau: type });
    if (!stage) {
      return res.status(404).json({
        success: false,
        message: "Stage introuvable pour cet ID et ce niveau.",
      });
    }

    // Vérifier si l'enseignant existe et a le rôle d'enseignant
    const teacher = await User.findOne({ _id: teacherId, role: "enseignant" });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Enseignant introuvable ou non valide.",
      });
    }

    // Mettre à jour l'enseignant assigné au stage
    stage.enseignant = teacherId;
    await stage.save();

    // Réponse en cas de succès
    res.status(200).json({
      success: true,
      message: "Enseignant mis à jour avec succès pour ce stage.",
      data: {
        stageId: stage._id,
        newTeacher: {
          id: teacher._id,
          nom: teacher.nom,
          prenom: teacher.prenom,
          email: teacher.adresseEmail,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors de la mise à jour de l'enseignant.",
      error: error.message,
    });
  }
};

export const publishOrHidePlanning = async (req, res) => {
  try {
    const { type, response } = req.params; // Récupérer le niveau (type) et l'action (response)

    // Convertir le paramètre `response` en booléen
    const publishStatus = response === "true";

    // Mettre à jour tous les stages du niveau donné avec le statut de publication
    const updatedStages = await StageEte.updateMany(
      { niveau: type },
      { publie: publishStatus }
    );

    // Vérifier si des stages ont été mis à jour
    if (updatedStages.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: `Aucun stage trouvé pour le niveau ${type}.`,
      });
    }

    // Réponse en cas de succès
    res.status(200).json({
      success: true,
      message: `Le planning pour le niveau ${type} a été ${
        publishStatus ? "publié" : "masqué"
      } avec succès.`,
      details: {
        niveau: type,
        totalUpdated: updatedStages.modifiedCount,
        status: publishStatus ? "publié" : "masqué",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        "Erreur lors de la mise à jour du statut de publication du planning.",
      error: error.message,
    });
  }
};

export const sendPlanning = async (req, res) => {
  try {
    const { link } = req.body;

    // Vérification des paramètres
    if (!link) {
      return res
        .status(400)
        .json({ success: false, message: "Lien  non fourni." });
    }

    // Récupérer les étudiants ayant déposé des stages
    const foundEtudiants = await User.find({
      role: "etudiant",
      _id: {
        $in: (
          await StageEte.find({ statutDepot: "Depose" })
        ).map((stage) => stage.etudiant),
      },
    });

    // Récupérer les enseignants assignés à des stages
    const foundEnseignants = await User.find({
      role: "enseignant",
      _id: {
        $in: (
          await StageEte.find({ enseignant: { $ne: null } })
        ).map((stage) => stage.enseignant),
      },
    });

    if (!foundEtudiants.length && !foundEnseignants.length) {
      return res.status(400).json({
        message: "Aucun étudiant ayant déposé ou enseignant assigné trouvé.",
      });
    }

    // Séparer les groupes en "premier envoi" et "envoi modifié"
    const etudiantsFirstSend = foundEtudiants.filter(
      (etudiant) => !etudiant.isFirstSendEte
    );
    const etudiantsAlreadySent = foundEtudiants.filter(
      (etudiant) => etudiant.isFirstSendEte
    );
    const enseignantsFirstSend = foundEnseignants.filter(
      (enseignant) => !enseignant.isFirstSendEte
    );
    const enseignantsAlreadySent = foundEnseignants.filter(
      (enseignant) => enseignant.isFirstSendEte
    );

    // Récupérer les emails
    const emailsFirstSend = [
      ...etudiantsFirstSend.map((etudiant) => etudiant.adresseEmail),
      ...enseignantsFirstSend.map((enseignant) => enseignant.adresseEmail),
    ];
    const emailsAlreadySent = [
      ...etudiantsAlreadySent.map((etudiant) => etudiant.adresseEmail),
      ...enseignantsAlreadySent.map((enseignant) => enseignant.adresseEmail),
    ];
    console.log(emailsFirstSend, emailsAlreadySent);
    if (!emailsFirstSend.length && !emailsAlreadySent.length) {
      return res.status(200).json({
        message: "Tous les étudiants et enseignants ont déjà reçu les emails.",
      });
    }

    // Configuration du transporteur SMTP
    const smtpTransport = nodemailer.createTransport({
      host: process.env.HOST,
      port: process.env.PORT_SSL,
      secure: true,
      service: process.env.MAILER_SERVICE_PROVIDER,
      auth: {
        user: process.env.MAILER_EMAIL_ID,
        pass: process.env.MAILER_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false, // Disable strict validation
      },
    });

    // Contenu des emails
    const firstSendHtml = `
      Bonjour,<br/><br/>
      Nous avons le plaisir de vous informer que le planning pour les stages est disponible. <br/>
      Vous pouvez consulter les détails via le lien suivant :<br/><br/>
      <a href="${link}" target="_blank" style="color: #007bff; text-decoration: none; font-weight: bold;">
        Accéder au planning
      </a><br/><br/>
      Cordialement,<br/>
      L'équipe administrative.
    `;

    const updatedSendHtml = `
      Bonjour,<br/><br/>
      Nous vous informons que le planning des stages a été mis à jour. <br/>
      Veuillez consulter les modifications en suivant le lien ci-dessous :<br/><br/>
      <a href="${link}" target="_blank" style="color: #007bff; text-decoration: none; font-weight: bold;">
        Accéder au planning mis à jour
      </a><br/><br/>
      Cordialement,<br/>
      L'équipe administrative.
    `;

    // Fonction d'envoi d'emails
    const sendEmail = async (destinataires, subject, htmlContent) => {
      const mailOptions = {
        from: process.env.MAILER_EMAIL_ID,
        to: destinataires,
        subject,
        html: htmlContent,
      };

      try {
        await smtpTransport.sendMail(mailOptions);
        console.log("Email sent successfully");
      } catch (error) {
        console.error("Error sending email:", error);
        throw new Error("Error sending email");
      }
    };

    // Envoi des emails
    if (emailsFirstSend.length) {
      await sendEmail(
        emailsFirstSend,
        "Publication du planning des stages",
        firstSendHtml
      );

      // Mise à jour des utilisateurs ayant reçu le premier email
      const firstSendIds = [
        ...etudiantsFirstSend.map((etudiant) => etudiant._id),
        ...enseignantsFirstSend.map((enseignant) => enseignant._id),
      ];
      await User.updateMany(
        { _id: { $in: firstSendIds } },
        { $set: { isFirstSendEte: true } }
      );
    }

    if (emailsAlreadySent.length) {
      await sendEmail(
        emailsAlreadySent,
        "Mise à jour du planning des stages",
        updatedSendHtml
      );
    }

    return res
      .status(200)
      .json({ success: true, message: "Emails envoyés avec succès." });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ success: false, message: "Erreur d'envoi des emails.", error });
  }
};

export const getAssignedStages = async (req, res) => {
  try {
    const { type } = req.params;
    // Valider le paramètre "type"
    if (!type || typeof type !== "string") {
      return res.status(400).json({
        success: false,
        message:
          "Le paramètre 'type' est requis et doit être une chaîne valide.",
      });
    }

    // Identifiant de l'enseignant depuis le token décodé
    const enseignantId = req.auth.userId;

    // Type de niveau (par exemple : 3ING)

    // Rechercher les stages assignés à cet enseignant et appartenant au niveau spécifié
    const stages = await StageEte.find({
      enseignant: enseignantId,
      niveau: type,
    })
      .populate({
        path: "etudiant",
        select: "nom adresseEmail", // Inclure nom et email de l'étudiant
      })
      .exec();

    // Vérifier si des stages sont trouvés
    if (!stages.length) {
      return res.status(404).json({
        success: false,
        message: "Aucun stage trouvé pour cet enseignant.",
      });
    }

    // Formater les résultats pour inclure les détails nécessaires
    const formattedStages = stages.map((stage) => ({
      titreSujet: stage.titreSujet,
      statutDepot: stage.statutDepot,
      documents: stage.documents,
      etudiant: {
        nom: stage.etudiant?.nom || "Non disponible",
        email: stage.etudiant?.adresseEmail || "Non disponible",
      },
    }));

    // Répondre avec la liste formatée
    return res.status(200).json({
      success: true,
      message: "Liste des stages assignés récupérée avec succès.",
      stages: formattedStages,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des stages assignés :",
      error
    );
    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
      error: error.message,
    });
  }
};

export const planifierSoutenance = async (req, res) => {
  const { type, id } = req.params;
  const { horaire, jour, lien } = req.body;

  try {
    // Trouver le stage
    const stage = await StageEte.findById(id);
    if (!stage) {
      return res.status(404).json({ message: "Stage non trouvé" });
    }

    // Créer une nouvelle soutenance
    const soutenance = new SoutenanceStageEte({
      horaire,
      jour,
      lien,
    });

    console.log(soutenance);
    // Associer la soutenance au stage
    stage.soutenance = soutenance._id;
    await stage.save();
    await soutenance.save();

    // Récupérer l'email de l'étudiant
    const etudiant = await User.findById(stage.etudiant);
    const emailEtudiant = etudiant.adresseEmail;

    console.log(etudiant);

    // Envoyer l'email
    const transporter = nodemailer.createTransport({
      host: process.env.HOST,
      port: process.env.PORT_SSL,
      secure: true,
      service: process.env.MAILER_SERVICE_PROVIDER,
      auth: {
        user: process.env.MAILER_EMAIL_ID,
        pass: process.env.MAILER_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false, // Disable strict validation
      },
    });

    const mailOptions = {
      from: process.env.MAILER_EMAIL_ID,
      to: emailEtudiant,
      subject: "Détails de votre soutenance",
      text: `Votre soutenance est planifiée pour le ${jour} à ${horaire}. Le lien de la réunion est : ${lien}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });

    res.json({ message: "Soutenance planifiée avec succès" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Erreur lors de la planification de la soutenance" });
  }
};
