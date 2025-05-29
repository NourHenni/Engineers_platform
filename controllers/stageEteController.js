import StageEte from "../models/stageEteModel.js";
import User from "../models/userModel.js";
import Matiere from "../models/matiereModel.js";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import SoutenanceStageEte from "../models/soutenanceStageEteModel.js";
import moment from "moment";
import periodeModel from "../models/periodeModel.js";
import yearModel from "../models/yearModel.js";

import dotenv from "dotenv";
import competenceModel from "../models/competenceModel.js";

// Load environment variables from .env file
dotenv.config();

//ajouter periode




export const addPeriod = async (req, res) => {
  try {
    const { DateDebutDepot, DateFinDepot, niveau } = req.body;

    // Vérifier les champs obligatoires
    if (!DateDebutDepot || !DateFinDepot || !niveau) {
      return res.status(400).json({
        success: false,
        message: "Veuillez fournir la date de début, date de fin et le niveau.",
      });
    }

    const currentDate = moment().utc().startOf("day");
    const start_date = moment.utc(DateDebutDepot + "T00:00:00Z");
    const end_date = moment.utc(DateFinDepot + "T23:59:59Z");

    // Validation des dates
    if (end_date.isBefore(currentDate)) {
      return res.status(400).json({
        success: false,
        message: "La date de fin ne peut pas être dans le passé.",
      });
    }

    if (end_date.isBefore(start_date)) {
      return res.status(400).json({
        success: false,
        message: "La date de fin ne peut pas être avant la date de début.",
      });
    }

    // Vérification des périodes existantes du même niveau
    const existingPeriods = await periodeModel.find({ niveau });

    for (const period of existingPeriods) {
      const state = period.PeriodState;
      if (state === "In progress" || state === "Not started yet") {
        return res.status(400).json({
          success: false,
          message: `Une période avec l'état '${state}' existe déjà pour ce niveau.`,
        });
      }
    }

    // Création de la période avec type par défaut
    const newPeriod = new periodeModel({
      Nom: "Summer Internship",
      Date_Debut_depot: start_date,
      Date_Fin_depot: end_date,
      type: "Summer Internship",
      niveau,
      PeriodState: start_date.isAfter(currentDate) ? "Not started yet" : "In progress",
    });

    await newPeriod.save();

    return res.status(200).json({
      success: true,
      message: "Période créée avec succès.",
      data: newPeriod,
    });

  } catch (error) {
    console.error("Erreur dans addPeriod:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur.",
      error: error.message,
    });
  }
};

// Récupérer toutes les périodes depuis la base de données

export const getAllPeriods = async (req, res) => {
  try {
    const niveaux = ["premiereannee", "deuxiemeannee"];

    // Récupérer toutes les périodes pour les deux niveaux
    const periodes = await periodeModel.find(
      { niveau: { $in: niveaux } },
      { Nom: 1, niveau: 1, PeriodState: 1, Date_Debut_depot: 1, Date_Fin_depot: 1 }
    ).sort({ Date_Debut_depot: -1 }); // optionnel : trier par date de début décroissante

    if (!periodes || periodes.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Aucune période trouvée pour les deux niveaux.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Périodes récupérées avec succès.",
      periodes,
    });

  } catch (error) {
    console.error("Erreur lors de la récupération des périodes:", error.message);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur. Réessayez plus tard.",
      error: error.message,
    });
  }
};

//mise a jour

export const updatePeriod = async (req, res) => {


  console.log("Received update request for:", req.params.id);
  console.log("Request body:", req.body);
  console.log("Headers:", req.headers);
  try {
    const { id } = req.params;
    const currentDate = moment().utc().startOf("day");
    
    // Conversion des dates
    const startDate = moment.utc(req.body.DateDebutDepot + "T00:00:00Z");
    const endDate = moment.utc(req.body.DateFinDepot + "T23:59:59Z");

    // Validation basique des dates
    if (endDate.isBefore(startDate)) {
      return res.status(400).json({
        success: false,
        message: "La date de fin ne peut pas être avant la date de début.",
      });
    }

    // Récupérer et mettre à jour la période
    const periodToUpdate = await periodeModel.findById(id);
    
    if (!periodToUpdate) {
      return res.status(404).json({
        success: false,
        message: "Période non trouvée.",
      });
    }

    // Mise à jour des dates
    periodToUpdate.Date_Debut_depot = startDate;
    periodToUpdate.Date_Fin_depot = endDate;

    // Détermination automatique du nouvel état
    periodToUpdate.PeriodState = startDate.isAfter(currentDate) 
      ? "Not started yet" 
      : endDate.isBefore(currentDate) 
        ? "Closed" 
        : "In progress";

    await periodToUpdate.save();

    return res.status(200).json({
      success: true,
      message: "Période mise à jour avec succès.",
      data: {
        _id: periodToUpdate._id,
        Nom: periodToUpdate.Nom,
        Date_Debut_depot: periodToUpdate.Date_Debut_depot,
        Date_Fin_depot: periodToUpdate.Date_Fin_depot,
        PeriodState: periodToUpdate.PeriodState,
        niveau: periodToUpdate.niveau
      }
    });

  } catch (error) {
    console.error("Erreur lors de la mise à jour de la période:", error.message);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur.",
      error: error.message,
    });
  }
};
export const deletePeriod = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Vérifier que l'ID est valide
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "ID de période invalide"
      });
    }

    // 2. Trouver la période avant suppression
    const periodToDelete = await periodeModel.findById(id);

    // 3. Vérifier si la période existe
    if (!periodToDelete) {
      return res.status(404).json({
        success: false,
        message: "Période non trouvée"
      });
    }


    // 5. Effectuer la suppression
    await periodeModel.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Période supprimée avec succès",
      deletedPeriod: {
        id: periodToDelete._id,
        nom: periodToDelete.Nom,
        type: periodToDelete.type
      }
    });

  } catch (error) {
    console.error("Erreur lors de la suppression:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message
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

      // Mise à jour du document de l'étudiant
      await User.findByIdAndUpdate(
        etudiantId,
        { $push: { stages: savedStage._id } },
        { new: true }
      );

      res.status(201).json({
        success: true,
        message: "Sujet de stage déposé avec succès.",
        stage: savedStage,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur lors du dépôt du sujet de stage.",
      error: error.message,
    });
  }
};

export const getInternshipsByTypeAndYear = async (req, res) => {
  const { type, anneeStage } = req.params;

  try {
    // Requête avec deux critères : niveau et anneeStage
    const stages = await StageEte.find({ niveau: type, anneeStage })
      .populate("etudiant", "nom prenom adresseEmail role _id")
      .populate("enseignant", "nom prenom adresseEmail _id")
      .populate("soutenance", "horaire jour lien _id");

    if (!stages || stages.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Aucun stage trouvé pour le niveau : ${type} et l'année : ${anneeStage}`,
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
        _id: stage._id,
        titreSujet: stage.titreSujet,
        nomEntreprise: stage.nomEntreprise,
        dateDebut: stage.dateDebut,
        dateFin: stage.dateFin,
        description: stage.description,
        natureSujet: stage.natureSujet,
        anneeStage: stage.anneeStage,
        statutSujet: stage.statutSujet,
        statutDepot: stage.statutDepot,
        raison: stage.raisonInvalidation,
        publie: stage.publie,
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
            _id: stage.soutenance._id,
            jour: stage.soutenance.jour,
            lien: stage.soutenance.lien,
          }
        : null,
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
    const { type, id } = req.params;

    // Validation renforcée des paramètres
    if (!id || id === 'undefined' || !mongoose.Types.ObjectId.isValid(id)) {
      console.error('ID invalide reçu:', id);
      return res.status(400).json({
        success: false,
        message: "ID de stage invalide ou manquant",
        receivedId: id,
        expectedFormat: "ObjectId MongoDB valide"
      });
    }

    // Recherche avec gestion d'erreur spécifique
    const stage = await StageEte.findOne({ _id: id, niveau: type })
      .populate("etudiant", "nom prenom adresseEmail cin role _id")  // Ajout explicitement _id
      .populate("enseignant", "nom adresseEmail _id")
      .populate("soutenance", "horaire jour lien _id")
      .orFail(new Error('Stage non trouvé'));

    // Construction de la réponse avec vérification des IDs
    const responseData = {
      etudiant: stage.etudiant ? {
        _id: stage.etudiant._id,
        nom: stage.etudiant.nom,
        prenom: stage.etudiant.prenom,
        email: stage.etudiant.adresseEmail,
        cin: stage.etudiant.cin
      } : null,
      enseignant: stage.enseignant ? {
        _id: stage.enseignant._id,
        nom: stage.enseignant.nom,
        email: stage.enseignant.adresseEmail
      } : null,
      stage: {
        _id: stage._id,
        titreSujet: stage.titreSujet,
        nomEntreprise: stage.nomEntreprise,
        dateDebut: stage.dateDebut,
        dateFin: stage.dateFin,
        description: stage.description,
        natureSujet: stage.natureSujet,
        statutSujet: stage.statutSujet,
        statutDepot: stage.statutDepot,
        raison: stage.raisonInvalidation,
        fichiers: {
          rapport: stage.rapport,
          attestation: stage.attestation,
          ficheEvaluation: stage.ficheEvaluation,
        },
      },
      soutenance: stage.soutenance ? {
        _id: stage.soutenance._id,
        horaire: stage.soutenance.horaire,
        jour: stage.soutenance.jour,
        lien: stage.soutenance.lien
      } : null
    };

    // Vérification finale avant envoi
    if (!responseData.stage._id) {
      throw new Error('Structure de réponse invalide: ID manquant');
    }

    return res.status(200).json({
      success: true,
      message: "Détails du stage récupérés avec succès",
      data: responseData
    });

  } catch (error) {
    console.error('Erreur critique:', {
      endpoint: '/internship/:type/:id',
      params: req.params,
      errorDetails: {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });

    if (error.message === 'Stage non trouvé') {
      return res.status(404).json({
        success: false,
        message: "Aucun stage correspondant trouvé"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Erreur de traitement",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      requestId: req.requestId // Si vous avez un système de tracing
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
    const { type } = req.params;
    const { teacherIds } = req.body;

    if (!teacherIds || teacherIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Liste des enseignants non fournie.",
      });
    }

    // Étape 1 : Récupérer le nombre de matières par enseignant depuis la collection Matiere
    const teacherMatieres = await Matiere.aggregate([
      {
        $match: {
          enseignant: {
            $in: teacherIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
        },
      },
      {
        $group: {
          _id: "$enseignant",
          totalMatieres: { $sum: 1 },
        },
      },
    ]);

    if (teacherMatieres.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Aucun enseignant avec des matières trouvées.",
      });
    }

    const totalMatieres = teacherMatieres.reduce(
      (sum, t) => sum + t.totalMatieres,
      0
    );

    // Étape 2 : Récupérer les stages non validés pour le niveau (type)
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

    // Étape 3 : Calcul du coefficient de répartition
    const coefficient = Math.floor(stages.length / totalMatieres);

    // Étape 4 : Distribution des stages proportionnelle
    let assignedStages = [];
    let stageIndex = 0;

    teacherMatieres.forEach((tm) => {
      const numStages = tm.totalMatieres * coefficient;
      for (let i = 0; i < numStages && stageIndex < stages.length; i++) {
        stages[stageIndex].enseignant = tm._id;
        assignedStages.push(stages[stageIndex]);
        stageIndex++;
      }
    });

    // Étape 5 : Répartition équitable des stages restants
    while (stageIndex < stages.length) {
      const tm = teacherMatieres[stageIndex % teacherMatieres.length];
      stages[stageIndex].enseignant = tm._id;
      assignedStages.push(stages[stageIndex]);
      stageIndex++;
    }

    // Étape 6 : Sauvegarder les modifications
    await Promise.all(assignedStages.map((stage) => stage.save()));
    // Regrouper les stages par enseignant
    const stagesParEnseignant = {};

    assignedStages.forEach((stage) => {
      const enseignantId = stage.enseignant.toString();
      if (!stagesParEnseignant[enseignantId]) {
        stagesParEnseignant[enseignantId] = [];
      }
      stagesParEnseignant[enseignantId].push(stage._id);
    });

    // Mettre à jour les utilisateurs enseignants avec tous leurs stages assignés
    await Promise.all(
      Object.entries(stagesParEnseignant).map(([enseignantId, stageIds]) =>
        User.findByIdAndUpdate(enseignantId, {
          $addToSet: { stagesEte: { $each: stageIds } }, // Ajoute sans doublons
        })
    ));

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
    const { type } = req.params;
    const { stageId, teacherId } = req.body;

    if (!stageId || !teacherId) {
      return res.status(400).json({
        success: false,
        message: "Les champs 'stageId' et 'teacherId' sont requis.",
      });
    }

    // Vérifie si le stage existe
    const stage = await StageEte.findOne({ _id: stageId, niveau: type });
    if (!stage) {
      return res.status(404).json({
        success: false,
        message: "Stage introuvable pour cet ID et ce niveau.",
      });
    }

    // Récupère l'ancien enseignant (si existant)
    const oldTeacherId = stage.enseignant;

    // Vérifie si le nouvel enseignant existe
    const newTeacher = await User.findOne({ _id: teacherId, role: "enseignant" });
    if (!newTeacher) {
      return res.status(404).json({
        success: false,
        message: "Enseignant introuvable ou non valide.",
      });
    }

    // Mise à jour du stage
    stage.enseignant = teacherId;
    await stage.save();

    // Supprimer le stage de l'ancien enseignant
    if (oldTeacherId && oldTeacherId.toString() !== teacherId) {
      await User.updateOne(
        { _id: oldTeacherId },
        { $pull: { stagesEte: stage._id } }
      );
    }

    // Ajouter le stage au nouvel enseignant (si pas déjà dedans)
    if (!newTeacher.stagesEte.includes(stage._id)) {
      newTeacher.stagesEte.push(stage._id);
      await newTeacher.save();
    }

    res.status(200).json({
      success: true,
      message: "Enseignant mis à jour avec succès pour ce stage.",
      data: {
        stageId: stage._id,
        newTeacher: {
          id: newTeacher._id,
          nom: newTeacher.nom,
          prenom: newTeacher.prenom,
          email: newTeacher.adresseEmail,
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

    if (!type || typeof type !== "string") {
      return res.status(400).json({
        success: false,
        message:
          "Le paramètre 'type' est requis et doit être une chaîne valide.",
      });
    }

    const enseignantId = req.auth.userId;

    const allYears = await yearModel.find().select("year"); // 

    if (!allYears.length) {
      return res.status(404).json({
        success: false,
        message: "Aucune année académique trouvée.",
      });
    }

    const validYears = allYears
      .map((y) => {
        if (y.year && typeof y.year === "string" && y.year.includes("-")) {
          const parts = y.year.split("-");
          const endYear = parseInt(parts[1]);
          return isNaN(endYear) ? null : endYear;
        }
        return null;
      })
      .filter((year) => year !== null);

    if (!validYears.length) {
      return res.status(404).json({
        success: false,
        message:
          "Aucune année académique valide n’a été trouvée dans le format attendu.",
      });
    }

    const latestYear = Math.max(...validYears); // e.g. 2025

    const stages = await StageEte.find({
      enseignant: enseignantId,
      niveau: type,
      anneeStage: String(latestYear),
    })
      .populate([
        {
          path: "etudiant",
          select: "nom adresseEmail",
        },
        {
          path: "soutenance",
          select: "horaire jour lien",
        },
      ])
      .exec();

    const formattedStages = stages.map((stage) => ({
      titreSujet: stage.titreSujet,
      _id: stage._id,
      nomEntreprise: stage.nomEntreprise,
      description: stage.description,
      niveau: stage.niveau,
      anneeStage: stage.anneeStage,
      natureSujet: stage.natureSujet,
      statutSujet: stage.statutSujet,
      raison: stage.raisonInvalidation,
      fichiers: {
        rapport: stage.rapport,
        attestation: stage.attestation,
        ficheEvaluation: stage.ficheEvaluation,
      },
      etudiant: {
        nom: stage.etudiant?.nom || "Non disponible",
        email: stage.etudiant?.adresseEmail || "Non disponible",
      },
      soutenance: stage.soutenance
        ? {
            _id: stage.soutenance._id,
            horaire: stage.soutenance.horaire,
            jour: stage.soutenance.jour,
            lien: stage.soutenance.lien,
          }
        : null,
    }));

    return res.status(200).json({
      success: true,
      message: `Liste des stages assignés pour l’année ${latestYear} récupérée avec succès.`,
      anneeChoisie: latestYear,
      stages: formattedStages,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des stages assignés :", error);
    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
      error: error.message,
    });
  }
};


export const planifierSoutenance = async (req, res) => {
  //console.log("Utilisateur connecté :", req.user);
  const { type, id } = req.params;
  const { horaire, jour, lien } = req.body;

  try {
    // Trouver le stage correspondant
    const stage = await StageEte.findById(id);

    if (!stage) {
      return res.status(404).json({ message: "Stage non trouvé." });
    }
    //console.log("Stage récupéré :", stage);

    // Vérifier que le type correspond au niveau du stage
    if (stage.niveau !== type) {
      return res.status(400).json({
        success: false,
        message: `Le niveau du stage (${stage.niveau}) ne correspond pas au type spécifié (${type}).`,
      });
    }

    // Vérifier que le sujet est affecté à un enseignant
    if (!stage.enseignant) {
      return res.status(400).json({
        success: false,
        message: "Le sujet n'est pas encore affecté à un enseignant.",
      });
    }
    
    // Vérifier que l'enseignant connecté est celui affecté au stage
    if (stage.enseignant._id.toString() !== req.user.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Accès refusé : Vous n'êtes pas l'enseignant affecté à ce sujet.",
      });
    }

    // Créer une nouvelle soutenance
    const soutenance = new SoutenanceStageEte({ horaire, jour, lien });

    // Associer la soutenance au stage
    stage.soutenance = soutenance._id;

    // Sauvegarder les données
    await Promise.all([stage.save(), soutenance.save()]);

    // Récupérer l'email de l'étudiant
    const etudiant = await User.findById(stage.etudiant);
    if (!etudiant) {
      return res.status(404).json({ message: "Étudiant non trouvé." });
    }

    const emailEtudiant = etudiant.adresseEmail;

    // Configurer le transporteur pour l'email
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
        rejectUnauthorized: false, // Désactiver la validation stricte
      },
    });

    // Définir les options de l'email
    const mailOptions = {
      from: process.env.MAILER_EMAIL_ID,
      to: emailEtudiant,
      subject: "Détails de votre soutenance",
      text: `Votre soutenance est planifiée pour le ${jour} à ${horaire}. Le lien de la réunion est : ${lien}.`,
    };

    // Envoyer l'email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Erreur lors de l'envoi de l'email : ", error);
      } else {
        console.log("Email envoyé : " + info.response);
      }
    });

    // Répondre avec succès
    res.json({ message: "Soutenance planifiée avec succès." });
  } catch (error) {
    console.error("Erreur :", error);
    res.status(500).json({
      error: "Erreur lors de la planification de la soutenance.",
    });
  }
};

export const modifierSoutenance = async (req, res) => {
  const { id } = req.params; // ID de la soutenance à modifier
  const { horaire, jour, lien } = req.body;

  try {
    // Trouver la soutenance
    const soutenance = await SoutenanceStageEte.findById(id);
    if (!soutenance) {
      return res.status(404).json({ message: "Soutenance non trouvée" });
    }

    // Mettre à jour les informations de la soutenance
    if (horaire) soutenance.horaire = horaire;
    if (jour) soutenance.jour = jour;
    if (lien) soutenance.lien = lien;

    await soutenance.save();

    // Trouver le stage associé pour récupérer l'ID de l'étudiant
    const stage = await StageEte.findOne({ soutenance: soutenance._id });
    if (!stage) {
      return res.status(404).json({ message: "Stage associé non trouvé" });
    }

    // Récupérer l'e-mail de l'étudiant
    const etudiant = await User.findById(stage.etudiant);
    if (!etudiant) {
      return res
        .status(404)
        .json({ message: "Étudiant associé à la soutenance non trouvé" });
    }
    const emailEtudiant = etudiant.adresseEmail;

    // Envoyer un e-mail pour notifier l'étudiant des changements
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
        rejectUnauthorized: false,
      },
    });

    const mailOptions = {
      from: process.env.MAILER_EMAIL_ID,
      to: emailEtudiant,
      subject: "Mise à jour de votre soutenance",
      text: `Votre soutenance a été mise à jour avec les détails suivants : 
      - Date : ${jour} 
      - Horaire : ${horaire} 
      - Lien de la réunion : ${lien}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Erreur lors de l'envoi de l'email :", error);
      } else {
        console.log("Email envoyé : " + info.response);
      }
    });

    res.json({ message: "Soutenance modifiée avec succès" });
  } catch (error) {
    console.error("Erreur lors de la modification de la soutenance :", error);
    res
      .status(500)
      .json({ error: "Erreur lors de la modification de la soutenance" });
  }
};

export const consulterAffectationByType = async (req, res) => {
  try {
    const { type } = req.params; // Récupérer le niveau depuis l'URL
    const userId = req.auth.userId; // Récupérer l'ID de l'étudiant connecté depuis le token

    // Vérifier que le type est valide
    if (!["premiereannee", "deuxiemeannee"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type invalide. Utilisez 'premiereannee' ou 'deuxiemeannee'.",
      });
    }

    // Récupérer le stage correspondant à l'étudiant connecté et au niveau spécifié
    const stage = await StageEte.findOne({ etudiant: userId, niveau: type })
      .populate("enseignant", "nom prenom adresseEmail") // Récupérer les infos de l'enseignant
      .populate("soutenance"); // Récupérer les détails de la soutenance

    // Si aucun stage n'est trouvé
    if (!stage) {
      return res.status(404).json({
        success: false,
        message: `Aucun stage trouvé pour le niveau '${type}' associé à cet étudiant.`,
      });
    }

    // Vérifier si le stage appartient bien à l'étudiant connecté
    if (stage.etudiant.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Accès refusé : ce stage ne vous appartient pas.",
      });
    }

    // Préparer la réponse
    const response = {
      success: true,
      stage: {
        titreSujet: stage.titreSujet,
        nomEntreprise: stage.nomEntreprise,
        description: stage.description,
        niveau: stage.niveau,
        anneeStage: stage.anneeStage,
        natureSujet: stage.natureSujet,
        statutSujet: stage.statutSujet,
        raison: stage.raisonInvalidation
      },
      enseignant: stage.enseignant
        ? {
            nom: stage.enseignant.nom,
            prenom: stage.enseignant.prenom,
            adresseEmail: stage.enseignant.adresseEmail,
          }
        : null, // Si aucun enseignant n'est affecté
      soutenance: stage.soutenance
        ? {
            jour: stage.soutenance.jour,
            horaire: stage.soutenance.horaire,
            lien: stage.soutenance.lien,
          }
        : null, // Si aucune soutenance n'est planifiée
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("Erreur lors de la récupération du stage :", error.message);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération du stage.",
      error: error.message,
    });
  }
};

export const validerSujet = async (req, res) => {
  const { type, id } = req.params; // Type (premiereannee, deuxiemeannee) et ID du stage
  const { statutSujet, raison } = req.body; // Statut (Valide/Non valide) et raison (si Non valide)

  try {
    // Vérifier l'existence du stage
    const stage = await StageEte.findById(id);
    if (!stage) {
      return res.status(404).json({
        success: false,
        message: "Stage non trouvé.",
      });
    }

    // Vérifier que le niveau correspond au type passé dans l'URL
    if (stage.niveau !== type) {
      return res.status(400).json({
        success: false,
        message: "Ce stage ne correspond pas au niveau spécifié.",
      });
    }

    // Vérifier que l'enseignant connecté est bien celui affecté au stage
    if (!stage.enseignant || stage.enseignant._id.toString() !== req.user.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Accès refusé : Vous n'êtes pas l'enseignant affecté à ce sujet.",
      });
    }

    // Valider ou invalider le sujet
    if (statutSujet === "Non valide") {
      // Si le statut est "Non valide", une raison doit être fournie
      if (!raison || raison.trim() === "") {
        return res.status(400).json({
          success: false,
          message: "Veuillez fournir une raison pour invalider le sujet.",
        });
      }
      stage.statutSujet = "Non valide";
      stage.raisonInvalidation = raison; // Ajouter un champ dynamique pour la raison
    } else if (statutSujet === "Valide") {
      stage.statutSujet = "Valide";
      stage.raisonInvalidation = undefined; // Supprimer la raison s'il y en avait une
    } else {
      return res.status(400).json({
        success: false,
        message: "Statut invalide : choisissez entre 'Valide' ou 'Non valide'.",
      });
    }

    // Sauvegarder les modifications
    await stage.save();

    res.status(200).json({
      success: true,
      message: "Le statut du sujet a été mis à jour avec succès.",
      stage,
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du sujet :", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne lors de la mise à jour du sujet.",
      error: error.message,
    });
  }
};






export const getAvailableYears = async (req, res) => {
  try {
    // Récupérer toutes les années distinctes des stages existants
    const stageYears = await StageEte.distinct("anneeStage");

    // Récupérer la dernière année académique créée
    const latestAcademicYearDoc = await yearModel.findOne().sort({ createdAt: -1 });
    let latestYear = null;

    // Vérifier si le document et le champ year existent AVANT de faire le split
    if (latestAcademicYearDoc && latestAcademicYearDoc.year) {
      const yearParts = latestAcademicYearDoc.year.split('-');
      if (yearParts.length === 2) {
        latestYear = yearParts[1]; // Prend la deuxième partie
      }
    }

    // Combiner les années des stages et la dernière année académique
    const combinedYears = new Set(stageYears);
    if (latestYear) {
      combinedYears.add(latestYear);
    }

    // Convertir en tableau et trier par ordre décroissant
    const years = Array.from(combinedYears).sort((a, b) => b - a);
    
    res.status(200).json({ 
      success: true,
      years 
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des années:", error);
    res.status(500).json({ 
      success: false,
      message: "Erreur lors de la récupération des années disponibles.",
      error: error.message 
    });
  }
};
