import pfaModel from "../models/pfaModel.js";
import userModel from "../models/userModel.js";
import moment from "moment";
import periodeModel from "../models/periodeModel.js";
import nodemailer from "nodemailer";
import soutenancePfaModel from "../models/soutenancePfaModel.js";
import mongoose from "mongoose";

const FROM_EMAIL = process.env.MAILER_EMAIL_ID;
const AUTH_PASSWORD = process.env.MAILER_PASSWORD;

const API_ENDPOINT =
  process.env.NODE_ENV === "production"
    ? process.env.PRODUCTION_API_URL
    : process.env.DEVELOPMENT_API_URL;

export const addPeriod = async (req, res) => {
  try {
    const currentDate = moment().utc().startOf("day"); // Date actuelle en UTC, au début de la journée

    // Assurez-vous que les dates sont au format ISO 8601 complet et validé
    const start_date = moment.utc(req.body.Date_Debut_depot + "T00:00:00Z");
    const end_date = moment.utc(req.body.Date_Fin_depot + "T23:59:59Z");

    // Validation des dates
    if (
      end_date.isBefore(currentDate) ||
      end_date.isBefore(start_date) ||
      start_date.isBefore(currentDate)
    ) {
      return res.status(400).json({
        success: false,
        message: "Date Invalide",
      });
    }

    // Création de la période
    const period = new periodeModel({
      Nom: req.body.Nom,
      Date_Debut_depot: start_date,
      Date_Fin_depot: end_date,
      type: req.body.type,
    });

    // Vérifier si le type existe déjà
    const foundPeriodType = await periodeModel.findOne({ type: period.type });

    if (foundPeriodType) {
      return res.status(400).send({
        message: "Une période avec ce type existe déjà.",
      });
    }

    // Déterminer l'état de la période
    if (start_date.isAfter(currentDate, "day")) {
      period.PeriodState = "Not started yet";
    } else if (start_date.isSameOrBefore(currentDate, "day")) {
      period.PeriodState = "In progress";
    }

    // Sauvegarder la période
    if (
      period.PeriodState === "In progress" ||
      period.PeriodState === "Not started yet"
    ) {
      await period.save();
      return res.status(200).send({ message: "Période créée avec succès." });
    }
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erreur serveur", error: error.message });
  }
};

// Contrôleur pour récupérer les informations sur les périodes
export const getPeriodes = async (req, res) => {
  try {
    // Récupérer toutes les périodes depuis la base de données
    const periodes = await periodeModel.find();

    // Vérifier si des périodes existent
    if (!periodes || periodes.length === 0) {
      return res.status(404).json({ error: "Aucune periode trouvee." });
    }

    // Retourner les périodes
    res.status(200).json({ periodes });
  } catch (error) {
    console.error(
      "Erreur lors de la recuperation des periodes:",
      error.message
    );
    res.status(500).json({ error: "Erreur serveur. Reessayez plus tard." });
  }
};

// Contrôleur pour modifier les délais de dépôt
export const updateDelais = async (req, res) => {
  try {
    const { DateDebutDepot, DateFinDepot } = req.body;

    // Recherche de la période spécifique (exemple : "PFA")
    const periode = await periodeModel.findOne({ type: "PFA Project" });

    if (!periode) {
      return res.status(404).json({ error: "Periode introuvable." });
    }

    const now = new Date();

    // Si la période a commencé, seule la date de fin peut être modifiée
    if (now >= periode.Date_Debut_depot) {
      if (
        DateDebutDepot &&
        new Date(DateDebutDepot).getTime() !==
          periode.Date_Debut_depot.getTime()
      ) {
        return res.status(400).json({
          error:
            "La période a commencé. La date de début ne peut pas être modifiée.",
        });
      }
    } else {
      // Si la période n'a pas encore commencé, permettre la modification de la période
      if (DateDebutDepot) {
        if (new Date(DateDebutDepot) >= new Date(DateFinDepot)) {
          return res.status(400).json({
            error: "La date de début doit être antérieure à la date de fin.",
          });
        }
        periode.Date_Debut_depot = new Date(DateDebutDepot);
      }
    }

    // Mise à jour de la date de fin
    periode.Date_Fin_depot = new Date(DateFinDepot);
    await periode.save();

    res.status(200).json({
      message: "Les délais ont été mis à jour avec succès.",
      periode,
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour des délais :", error.message);
    res.status(500).json({
      error: "Erreur serveur. Veuillez réessayer plus tard.",
    });
  }
};

export const ajouterSujetPfa = async (req, res) => {
  try {
    const {
      titreSujet,
      description,
      technologies,
      estBinome,
      idEtudiant1,
      idEtudiant2,
    } = req.body;

    // Vérification de la période
    const periode = await periodeModel.findOne({ type: "PFA Project" });
    if (!periode) {
      return res
        .status(404)
        .json({ message: "Aucune période trouvée pour le PFA." });
    }

    const now = new Date();
    if (now < periode.Date_Debut_depot || now > periode.Date_Fin_depot) {
      return res.status(400).json({
        message: "La période n'est pas active ou est dépassée.",
      });
    }

    let etudiants = [];

    if (estBinome) {
      // Si estBinome est vrai, les étudiants sont facultatifs
      if (!idEtudiant1 && !idEtudiant2) {
        console.warn("Aucun étudiant associé au sujet binôme.");
      } else {
        const etudiant1 = idEtudiant1
          ? await userModel.findOne({ _id: idEtudiant1, role: "etudiant" })
          : null;
        const etudiant2 = idEtudiant2
          ? await userModel.findOne({ _id: idEtudiant2, role: "etudiant" })
          : null;

        if (etudiant1) etudiants.push(etudiant1._id);
        if (etudiant2) etudiants.push(etudiant2._id);

        // Empêcher l'utilisation du même étudiant deux fois
        if (idEtudiant1 && idEtudiant2 && idEtudiant1 === idEtudiant2) {
          return res.status(400).json({
            message:
              "Les deux identifiants d'étudiants doivent être différents.",
          });
        }
      }
    } else {
      // Si estBinome est faux, gérer un seul étudiant
      if (idEtudiant1) {
        const etudiant = await userModel.findOne({
          _id: idEtudiant1,
          role: "etudiant",
        });

        if (!etudiant) {
          return res
            .status(404)
            .json({ message: "Étudiant introuvable ou non valide." });
        }

        etudiants = [etudiant._id];
      }

      // Si estBinome est faux et deux identifiants d'étudiants sont fournis
      if (idEtudiant1 && idEtudiant2) {
        return res.status(400).json({
          message:
            "Seul un étudiant peut être associé lorsque estBinome est faux.",
        });
      }
    }

    // Génération du code PFA
    const generateCodePfa = async () => {
      const currentYear = new Date().getFullYear();
      const lastPfa = await pfaModel.findOne().sort({ _id: -1 });

      if (lastPfa && lastPfa.code_pfa) {
        const parts = lastPfa.code_pfa.split("-");
        const lastIdNumber = parts.length > 1 ? parseInt(parts[1], 10) : 0;
        const nextIdNumber = isNaN(lastIdNumber) ? 1 : lastIdNumber + 1;
        return `PFA${currentYear}-${String(nextIdNumber).padStart(2, "0")}`;
      } else {
        return `PFA${currentYear}-01`;
      }
    };

    const codePfa = await generateCodePfa();
    // Création d'un sujet PFA
    const nouveauPfa = new pfaModel({
      code_pfa: codePfa,
      titreSujet,
      description,
      technologies,
      annee: new Date().getFullYear(),
      estBinome,
      enseignant: req.auth.userId,
      etudiants, // Utilisation du tableau etudiants
    });

    // Sauvegarde du sujet PFA
    await nouveauPfa.save();

    // Utilisation de populate pour inclure les informations de l'enseignant et des étudiants
    const sujetAvecEnseignant = await pfaModel
      .findById(nouveauPfa._id)
      .populate("enseignant", "nom prenom email") // Ajoutez les champs requis
      .populate("etudiants", "nom prenom email");

    if (sujetAvecEnseignant) {
      return res.status(201).json({
        message: "Sujet PFA ajouté avec succès.",
        sujet: sujetAvecEnseignant,
      });
    } else {
      throw new Error("Erreur inconnue lors de la récupération du sujet.");
    }
  } catch (error) {
    console.error("Erreur détectée :", error.message);
    return res
      .status(500)
      .json({ message: `Erreur serveur: ${error.message} ` });
  }
};

export const getPfaByAnnee = async (req, res) => {
  try {
    const { annee } = req.params;

    if (!annee || isNaN(annee)) {
      return res.status(400).json({
        message: "L'année fournie est invalide.",
      });
    }

    const pfas = await pfaModel
      .find({ annee: parseInt(annee) })
      .populate("enseignant", "nom prenom email")
      .populate("etudiants", "nom prenom email");

    if (pfas.length === 0) {
      return res.status(404).json({
        message: `Aucun sujet PFA trouvé pour l'année ${annee}.`,
      });
    }

    return res.status(200).json({
      message: `Sujets PFA pour l'année ${annee} récupérés avec succès.`,
      pfas,
    });
  } catch (error) {
    console.error("Erreur détectée :", error.message);
    return res
      .status(500)
      .json({ message: `Erreur serveur: ${error.message} ` });
  }
};

export const getAllPfasByTeacher = async (req, res) => {
  try {
    // Vérification du rôle de l'utilisateur
    if (req.auth.role !== "enseignant") {
      return res.status(403).json({
        message: "Accès interdit : uniquement accessible aux enseignants.",
      });
    }

    // Récupérer tous les sujets PFA déposés par l'enseignant connecté
    const sujets = await pfaModel
      .find({ enseignant: req.auth.userId })
      .populate("enseignant", "nom prenom adresseEmail") // Inclut les détails de l'enseignant
      .exec();

    // Vérifier si des sujets ont été trouvés
    if (!sujets || sujets.length === 0) {
      return res.status(404).json({
        message: "Aucun sujet PFA trouvé pour cet enseignant.",
      });
    }

    // Retourner les informations des sujets
    res.status(200).json({
      message: "Tous les sujets PFA déposés par l'enseignant.",
      sujets, // juste afficher les coordonnées du sujets PFA sans les informations de l'enseignant
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des sujets PFA :", error);
    res.status(500).json({
      message: "Erreur serveur. Veuillez réessayer plus tard.",
    });
  }
};

export const getPfaByIdForTeacher = async (req, res) => {
  try {
    const { id } = req.params; // Récupérer l'ID du sujet depuis les paramètres de la requête

    // Vérification du rôle de l'utilisateur
    if (req.auth.role !== "enseignant") {
      return res.status(403).json({
        message: "Accès interdit : uniquement accessible aux enseignants.",
      });
    }

    // Rechercher le sujet PFA par ID
    const sujet = await pfaModel
      .findById(id)
      .populate("enseignant", "nom prenom adresseEmail") // Inclut les détails de l'enseignant
      .exec();

    // Vérifier si le sujet existe
    if (!sujet) {
      return res.status(404).json({
        message: "Sujet PFA introuvable.",
      });
    }

    // Vérifier si le sujet appartient à l'enseignant connecté
    if (sujet.enseignant._id.toString() !== req.auth.userId) {
      return res.status(403).json({
        message: "Accès interdit : ce sujet ne vous appartient pas.",
      });
    }

    // Retourner les informations sur le sujet
    res.status(200).json({
      message: "Informations sur le sujet PFA.",
      sujet,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du sujet PFA :", error);
    res.status(500).json({
      message: "Erreur serveur. Veuillez réessayer plus tard.",
    });
  }
};

// Contrôleur pour modifier un sujet PFA
export const modifyPfaSubject = async (req, res) => {
  try {
    const { id } = req.params; // Récupérer l'ID du sujet depuis les paramètres de la requête
    const {
      titreSujet,
      description,
      technologies,
      estBinome,
      idEtudiant1,
      idEtudiant2,
    } = req.body;

    // Vérification du rôle de l'utilisateur (doit être enseignant)
    if (req.auth.role !== "enseignant") {
      return res.status(403).json({
        message: "Accès interdit : uniquement accessible aux enseignants.",
      });
    }

    // Rechercher le sujet PFA par ID
    const sujet = await pfaModel.findById(id);

    // Vérifier si le sujet existe
    if (!sujet) {
      return res.status(404).json({
        message: "Sujet PFA introuvable.",
      });
    }

    // Vérifier si le sujet appartient à l'enseignant connecté
    if (sujet.enseignant.toString() !== req.auth.userId) {
      return res.status(403).json({
        message: "Accès interdit : ce sujet ne vous appartient pas.",
      });
    }

    // Vérification de la période
    const periode = await periodeModel.findOne({ type: "PFA Project" });

    if (!periode) {
      return res
        .status(404)
        .json({ message: "Aucune période trouvée pour le PFA." });
    }

    const now = new Date();
    if (now < periode.Date_Debut_depot || now > periode.Date_Fin_depot) {
      return res.status(400).json({
        message: "La période n'est pas active ou est dépassée.",
      });
    }

    // Mettre à jour les informations du sujet PFA
    if (titreSujet) sujet.titreSujet = titreSujet;
    if (description) sujet.description = description;
    if (technologies) sujet.technologies = technologies;
    if (estBinome !== undefined) sujet.estBinome = estBinome;

    let etudiants = [];

    // Si estBinome est vrai, essayer de trouver deux étudiants si les informations sont données
    if (estBinome) {
      const etudiant1 = await userModel.findOne({
        _id: idEtudiant1,
        role: "etudiant",
      });
      const etudiant2 = await userModel.findOne({
        _id: idEtudiant2,
        role: "etudiant",
      });

      if (!etudiant1 || !etudiant2) {
        return res.status(404).json({
          message: "Un ou les deux étudiants sont introuvables ou non valides.",
        });
      }
      // Empêcher l'utilisation du même étudiant deux fois
      if (idEtudiant1 === idEtudiant2) {
        return res.status(400).json({
          message: "Les deux identifiants d'étudiants doivent être différents.",
        });
      }
      etudiants = [etudiant1._id, etudiant2._id];
    } else {
      // Si estBinome est faux, rechercher un seul étudiant si les informations sont données
      if (idEtudiant1) {
        const etudiant = await userModel.findOne({
          _id: idEtudiant1,
          role: "etudiant",
        });

        if (!etudiant) {
          return res
            .status(404)
            .json({ message: "Étudiant introuvable ou non valide." });
        }

        etudiants = [etudiant._id];
      }

      // Si estBinome est faux et deux identifiants d'étudiants sont fournis
      if (idEtudiant1 && idEtudiant2) {
        return res.status(400).json({
          message:
            "Seul un étudiant peut être associé lorsque estBinome est faux.",
        });
      }
    }
    // Mettre à jour le tableau des étudiants dans le sujet
    sujet.etudiants = etudiants;

    // Sauvegarder les modifications du sujet
    await sujet.save();

    res.status(200).json({
      message: "Sujet PFA modifié avec succès.",
      sujet,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la modification du sujet PFA :",
      error.message
    );
    res.status(500).json({
      message: "Erreur serveur. Veuillez réessayer plus tard.",
    });
  }
};

// Contrôleur pour supprimer un sujet PFA
export const deletePfa = async (req, res) => {
  try {
    const { id } = req.params; // Récupérer l'ID du sujet depuis les paramètres

    // Vérification du rôle de l'utilisateur
    if (req.auth.role !== "enseignant") {
      return res.status(403).json({
        message: "Accès interdit : seul un enseignant peut supprimer un sujet.",
      });
    }

    // Recherche du sujet PFA par ID
    const sujet = await pfaModel.findById(id);

    // Vérification si le sujet existe
    if (!sujet) {
      return res.status(404).json({
        message: "Sujet PFA introuvable.",
      });
    }

    // Vérifier si le sujet appartient à l'enseignant connecté
    if (sujet.enseignant._id.toString() !== req.auth.userId) {
      return res.status(403).json({
        message: "Accès interdit : ce sujet ne vous appartient pas.",
      });
    }

    // Vérification de la période
    const periode = await periodeModel.findOne({ type: "PFA Project" });

    if (!periode) {
      return res
        .status(404)
        .json({ message: "Aucune période trouvée pour le PFA." });
    }

    const now = new Date();
    if (now < periode.Date_Debut_depot || now > periode.Date_Fin_depot) {
      return res.status(400).json({
        message: "La période n'est pas active ou est dépassée.",
      });
    }

    // Suppression du sujet
    await pfaModel.findByIdAndDelete(id);

    res.status(200).json({
      message: "Sujet PFA supprimé avec succès.",
    });
  } catch (error) {
    console.error(
      "Erreur lors de la suppression du sujet PFA :",
      error.message
    );
    res.status(500).json({
      message: "Erreur serveur. Veuillez réessayer plus tard.",
    });
  }
};

export const getPfasByTeacherForStudents = async (req, res) => {
  try {
    // Vérification du rôle de l'utilisateur (doit être étudiant)
    if (req.auth.role !== "etudiant") {
      return res.status(403).json({
        message: "Accès interdit : uniquement accessible aux étudiants.",
      });
    }

    // Récupérer tous les enseignants ayant proposé des sujets PFA
    const enseignants = await userModel
      .find({ role: "enseignant" })
      .select("_id nom prenom adresseEmail");

    // Récupérer les sujets PFA par enseignant
    const sujetsParEnseignant = await Promise.all(
      enseignants.map(async (enseignant) => {
        const sujets = await pfaModel
          .find({ enseignant: enseignant._id })
          .select(
            "titreSujet description technologies estBinome etatAffectation"
          );
        return {
          enseignant,
          sujets,
        };
      })
    );

    // Vérification si tous les sujets sont vides
    const enseignantsAvecSujets = sujetsParEnseignant.filter(
      (enseignant) => enseignant.sujets.length > 0
    );

    if (enseignantsAvecSujets.length === 0) {
      return res.status(404).json({
        message: "Aucun sujet PFA trouvé.",
      });
    }

    // Retourner les informations des sujets PFA groupées par enseignant
    res.status(200).json({
      message: "Liste des sujets PFA par enseignant.",
      data: enseignantsAvecSujets,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des sujets PFA :", error);
    res.status(500).json({
      message: "Erreur serveur. Veuillez réessayer plus tard.",
    });
  }
};

export const fetchPfas = async (req, res) => {
  // #swagger.tags = ['PFAS']
  try {
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

export const fecthPfaById = async (req, res) => {
  try {
    // Récupérer le sujet PFA par son ID
    const sujetPFA = await pfaModel.findOne({ _id: req.params.idPFA });

    if (!sujetPFA) {
      return res.status(400).json({
        success: false,
        message: "Sujet PFA inexistant, veuillez vérifier !!",
      });
    }

    const userId = req.auth.userId;
    const userRole = req.auth.role;

    if (userRole === "admin") {
      // Si l'utilisateur est un administrateur
      return res.status(200).json({
        success: true,
        model: sujetPFA,
        message: "Le sujet PFA est récupéré avec succès.",
      });
    }

    if (userRole === "etudiant") {
      // Si l'utilisateur est un étudiant, vérifier son niveau
      const foundEtudiant = await userModel.findOne({
        _id: userId,
        niveau: 2,
      });

      if (!foundEtudiant) {
        return res.status(403).json({
          success: false,
          message:
            "Accès refusé. Vous devez être au niveau 2ING pour accéder à ce sujet PFA.",
        });
      }

      // Supprimer certains champs sensibles/non pertinents avant de retourner les données
      const {
        updatedAt,
        createdAt,
        _id,
        choices,
        etatAffectation,
        enseignant,
        etatDepot,
        ...filteredPfa
      } = sujetPFA.toObject();

      return res.status(200).json({
        success: true,
        model: filteredPfa,
        message: "Sujet PFA récupéré avec succès.",
      });
    }

    // Si le rôle n'est ni "admin" ni "etudiant"
    return res.status(403).json({
      success: false,
      message:
        "Accès refusé. Vous n'êtes pas autorisé à accéder à ce sujet PFA.",
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du sujet PFA :", error);
    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la récupération du sujet PFA.",
    });
  }
};

export const changeState = async (req, res) => {
  try {
    const sujetPFA = await pfaModel.findById(req.params.idPFA);

    if (!sujetPFA) {
      return res.status(400).json({
        message: "Sujet PFA inexistant, veuillez vérifier !!",
      });
    }
    const { etatDepot } = req.body;
    if (sujetPFA.etatDepot === "not rejected" && etatDepot === "rejected") {
      sujetPFA.etatDepot = etatDepot;

      await sujetPFA.save();

      return res.status(200).json({
        message: "Le statut du sujet PFA est changé en rejeté avec succès",
      });
    } else {
      return res.status(400).json({
        message: "La transition vers cet état n'est pas autorisée.",
      });
    }
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const publishPfas = async (req, res) => {
  try {
    const response = req.params.response;

    if (response == "true") {
      const currentDate = moment().utc().startOf("day");
      const start_date = moment(req.body.dateDebutChoix + "T00:00:00Z").utc();
      const end_date = moment(req.body.dateFinChoix + "T23:59:59Z").utc();
      if (end_date.isBefore(currentDate) || end_date.isBefore(start_date)) {
        res.status(400).json({
          success: false,
          message: "Date Invalide",
        });
      } else {
        const foundPfas = await pfaModel.find({ etatDepot: "not rejected" });
        if (foundPfas.length > 0) {
          const periodChoix = new periodeModel({
            Nom: req.body.Nom,
            Date_Debut_choix: start_date,
            Date_Fin_choix: end_date,
            type: req.body.type,
          });
          const foundPeriodType = await periodeModel.findOne({
            Nom: periodChoix.Nom,
          });
          if (!foundPeriodType) {
            if (start_date.isAfter(currentDate, "day")) {
              periodChoix.PeriodState = "Not started yet";
            } else if (
              start_date.isSame(currentDate, "day") ||
              start_date.isBefore(currentDate, "day")
            ) {
              periodChoix.PeriodState = "In progress";
            }
            if (
              periodChoix.PeriodState == "In progress" ||
              periodChoix.PeriodState == "Not started yet"
            ) {
              await periodChoix.save();
              await pfaModel.updateMany(
                { etatDepot: "not rejected" },
                { etatDepot: "published" }
              );

              res
                .status(200)
                .send(
                  `${foundPfas.length} PFAs publiés et période mise à jour.`
                );
            }
          } else {
            res.status(400).send({
              message: "Une periode de choix des sujets Pfas éxiste deja ",
            });
          }
        } else {
          res.status(200).send("Aucun PFA à publier.");
        }
      }
    } else {
      await pfaModel.updateMany(
        { etatDepot: "published" },
        { etatDepot: "masked" }
      );
      res.status(200).send("Liste des PFA masquée.");
    }
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

export const sendListePfa = async (req, res) => {
  try {
    // Trouver les étudiants au niveau 2ING
    const foundEtudiants = await userModel.find({
      $and: [{ role: "etudiant" }, { niveau: 2 }],
    });

    if (!foundEtudiants.length) {
      return res.status(400).json({ message: "Aucun étudiant trouvé." });
    }

    // Trouver les enseignants ayant déposé des sujets PFA
    const teachersWithPfa = await userModel.find({
      role: "enseignant",
      _id: {
        $in: (
          await pfaModel
            .find({ enseignant: { $ne: null } })
            .select("enseignant")
        ).map((pfa) => pfa.enseignant),
      },
    });

    if (!teachersWithPfa.length) {
      return res.status(400).json({ message: "Aucun enseignant trouvé." });
    }

    // Séparer les étudiants en deux groupes
    const etudiantsFirstSend = foundEtudiants.filter(
      (etudiant) => !etudiant.isFirstSendPfa
    );
    const etudiantsAlreadySent = foundEtudiants.filter(
      (etudiant) => etudiant.isFirstSendPfa
    );

    // Séparer les enseignants en deux groupes
    const enseignantsFirstSend = teachersWithPfa.filter(
      (enseignant) => !enseignant.isFirstSendPfa
    );
    const enseignantsAlreadySent = teachersWithPfa.filter(
      (enseignant) => enseignant.isFirstSendPfa
    );

    // Construire les listes d'emails
    const emailsFirstSend = [
      ...etudiantsFirstSend.map((etudiant) => etudiant.adresseEmail),
      ...enseignantsFirstSend.map((enseignant) => enseignant.adresseEmail),
    ];

    const emailsAlreadySent = [
      ...etudiantsAlreadySent.map((etudiant) => etudiant.adresseEmail),
      ...enseignantsAlreadySent.map((enseignant) => enseignant.adresseEmail),
    ];

    if (!emailsFirstSend.length && !emailsAlreadySent.length) {
      return res
        .status(200)
        .json({ message: "Tous les emails ont déjà été envoyés." });
    }

    // Configuration du transporteur SMTP
    const smtpTransport = nodemailer.createTransport({
      host: process.env.HOST,
      port: process.env.PORT_SSL,
      secure: false,
      service: process.env.MAILER_SERVICE_PROVIDER,
      auth: {
        user: FROM_EMAIL,
        pass: AUTH_PASSWORD,
      },
    });

    // Contenu des emails
    const firstSendHtml = `
      Bonjour,<br/><br/>
      Nous avons le plaisir de vous informer que la liste des sujets pour les Projets de Fin d’Année (PFAs) a été publiée. <br/>
      Vous pouvez consulter les détails des sujets en suivant le lien ci-dessous :<br/><br/>
      <a href="${API_ENDPOINT}/getPfas" target="_blank" style="color: #007bff; text-decoration: none; font-weight: bold;">
        Accéder à la liste des sujets
      </a><br/><br/>
      Cordialement,<br/>
      L’équipe de coordination des PFAs.
    `;

    const updatedSendHtml = `
      Bonjour,<br/><br/>
      Nous vous informons que la liste des sujets pour les Projets de Fin d’Année (PFAs) a été mise à jour. <br/>
      Veuillez consulter les modifications en suivant le lien ci-dessous :<br/><br/>
      <a href="${API_ENDPOINT}/getPfas" target="_blank" style="color: #007bff; text-decoration: none; font-weight: bold;">
        Accéder à la liste mise à jour
      </a><br/><br/>
      Cordialement,<br/>
      L’équipe de coordination des PFAs.
    `;

    // Fonction d'envoi d'emails
    const sendEmail = async (destinataires, subject, htmlContent) => {
      const mailOptions = {
        from: FROM_EMAIL,
        to: destinataires,
        subject,
        html: htmlContent,
      };

      return smtpTransport.sendMail(mailOptions);
    };

    // Envoi des emails
    if (emailsFirstSend.length) {
      await sendEmail(
        emailsFirstSend,
        "Publication des sujets de PFAs",
        firstSendHtml
      );

      // Mettre à jour le statut `isFirstSend` pour étudiants et enseignants
      const firstSendIds = [
        ...etudiantsFirstSend.map((etudiant) => etudiant._id),
        ...enseignantsFirstSend.map((enseignant) => enseignant._id),
      ];

      await userModel.updateMany(
        { _id: { $in: firstSendIds } },
        { $set: { isFirstSendPfa: true } }
      );
    }

    if (emailsAlreadySent.length) {
      await sendEmail(
        emailsAlreadySent,
        "Mise à jour des sujets de PFAs",
        updatedSendHtml
      );
    }

    return res
      .status(200)
      .json({ success: true, message: "Emails envoyés avec succès." });
  } catch (error) {
    console.error("Erreur :", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const fetchPublishedPfa = async (req, res) => {
  try {
    const studentId = req.auth.userId;

    const foundEtudiant = await userModel.findOne({
      $and: [{ _id: studentId }, { niveau: 2 }],
    });

    if (!foundEtudiant) {
      return res
        .status(400)
        .json({ message: " pas encore des étudiants en 2 eme " });
    }
    const sujetsPfa = await pfaModel.find({
      etatDepot: "published",
    });

    if (sujetsPfa.length === 0) {
      res.status(400).json({ message: " pas encore de sujets pfa publiés" });
    } else {
      res
        .status(200)
        .json({ model: sujetsPfa, message: " Les sujets pfas publiés" });
    }
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const choosePfaSubjects = async (req, res) => {
  try {
    const studentId = req.auth.userId; // ID de l'étudiant
    const { choices, binomeId, acceptedPfa } = req.body;

    const foundEtudiant = await userModel.findOne({
      $and: [{ _id: studentId }, { niveau: 2 }],
    });

    if (!foundEtudiant) {
      return res.status(400).json({
        message:
          "Seuls les étudiants en 2ème année peuvent choisir des sujets PFA.",
      });
    }

    // Vérifier si l'étudiant est déjà binôme dans 3 sujets
    const binomeExistingCount = await pfaModel.aggregate([
      {
        $match: {
          "choices.binomeIds.binomeId": studentId,
        },
      },
      {
        $group: {
          _id: "$code_pfa",
        },
      },
      {
        $count: "total",
      },
    ]);

    if (binomeExistingCount[0]?.total >= 3) {
      return res.status(400).json({
        success: false,
        message:
          "Vous ne pouvez pas choisir de sujets car vous êtes déjà binôme dans 3 sujets.",
      });
    }

    // Vérifier si l'étudiant a déjà effectué des choix
    const existingChoices = await pfaModel.findOne({
      "choices.etudiantsIds": studentId,
    });

    if (existingChoices) {
      return res.status(400).json({
        success: false,
        message:
          "Vous avez déjà fait vos choix. Vous ne pouvez pas en faire de nouveaux.",
      });
    }

    // Validation 1 : Exactement 3 choix
    if (!choices || choices.length !== 3) {
      return res.status(400).json({
        success: false,
        message:
          "Vous devez choisir exactement 3 sujets avec des priorités différentes.",
      });
    }

    // Validation 2 : Priorités uniques
    const uniquePriorities = new Set(choices.map((choice) => choice.priority));
    if (uniquePriorities.size !== 3) {
      return res.status(400).json({
        success: false,
        message: "Les priorités des sujets doivent être uniques.",
      });
    }

    // Validation 3 : Sujets uniques
    const uniqueSubjects = new Set(choices.map((choice) => choice.codePfa));
    if (uniqueSubjects.size !== 3) {
      return res.status(400).json({
        success: false,
        message:
          "Vous ne pouvez pas choisir le même sujet avec des priorités différentes.",
      });
    }

    // Validation du binôme
    let binome = null;
    if (binomeId) {
      binome = await userModel.findOne({
        _id: binomeId,
        role: "etudiant",
        niveau: 2,
      });

      if (!binome || binomeId === studentId) {
        return res.status(400).json({
          success: false,
          message:
            "Le binôme est invalide ou identique à l'étudiant principal ou le binôme n'est pas en 2ING.",
        });
      }
    }

    const binomeChoicesCount = await pfaModel.countDocuments({
      $or: [
        { "choices.etudiantsIds": binomeId }, // Le binôme a déjà fait des choix seul
        { "choices.binomeIds.binomeId": binomeId }, // Le binôme apparaît comme binôme d'un autre étudiant
      ],
    });

    if (binomeChoicesCount >= 3) {
      return res.status(400).json({
        success: false,
        message:
          "Le binôme a déjà effectué 3 choix ou est déjà binôme avec un autre étudiant. Vous ne pouvez pas l'ajouter.",
      });
    }

    // Validation des sujets
    for (const choice of choices) {
      const pfa = await pfaModel.findOne({
        code_pfa: choice.codePfa,
        etatDepot: "published",
      });

      if (!pfa) {
        return res.status(404).json({
          success: false,
          message: `Le sujet ${choice.codePfa} est introuvable ou masqué.`,
        });
      }

      if (pfa.estBinome && !binomeId) {
        return res.status(400).json({
          success: false,
          message: `Le sujet ${pfa.code_pfa} nécessite un binôme.`,
        });
      }

      if (pfa.etatAffectation === "affected") {
        return res.status(400).json({
          success: false,
          message: `Le sujet ${choice.codePfa} est déjà affecté.`,
        });
      }

      // Vérifier si le sujet est déjà accepté
      if (
        pfa.choices.some((c) => c.acceptedPfa?.etudiantsAcceptedIds?.length > 0)
      ) {
        if (acceptedPfa === choice.codePfa) {
          return res.status(400).json({
            success: false,
            message: `Le sujet ${choice.codePfa} est déjà accepté par un autre étudiant ou binôme.`,
          });
        }
      }
    }

    // Enregistrer les choix
    await Promise.all(
      choices.map(async (choice) => {
        const pfa = await pfaModel.findOne({ code_pfa: choice.codePfa });

        const existingChoice = pfa.choices.find(
          (ch) => ch.priority === choice.priority
        );

        if (existingChoice) {
          await pfaModel.updateOne(
            {
              code_pfa: choice.codePfa,
              "choices.priority": choice.priority,
            },
            {
              $addToSet: {
                "choices.$.etudiantsIds": studentId,
                "choices.$.binomeIds":
                  pfa.estBinome && binomeId
                    ? { etudiantId: studentId, binomeId }
                    : [],
              },
            }
          );
        } else {
          const choiceData = {
            priority: choice.priority,
            etudiantsIds: [studentId],
            binomeIds:
              pfa.estBinome && binomeId
                ? [{ etudiantId: studentId, binomeId }]
                : [],
          };

          await pfaModel.updateOne(
            { code_pfa: choice.codePfa },
            {
              $addToSet: {
                choices: choiceData,
              },
            }
          );
        }
      })
    );

    // Gestion du sujet accepté
    if (acceptedPfa) {
      const pfa = await pfaModel.findOne({ code_pfa: acceptedPfa });
      if (
        pfa.choices.some((c) => c.acceptedPfa?.etudiantsAcceptedIds?.length > 0)
      ) {
        return res.status(400).json({
          success: false,
          message: `Le sujet ${acceptedPfa} est déjà accepté par un autre étudiant ou binôme.`,
        });
      }

      const acceptedStudents = [studentId];
      if (binomeId) {
        acceptedStudents.push(binomeId);
      }

      await pfaModel.updateOne(
        { code_pfa: acceptedPfa },
        {
          $set: {
            "choices.$[elem].acceptedPfa.etudiantsAcceptedIds":
              acceptedStudents,
          },
        },
        {
          arrayFilters: [{ "elem.etudiantsIds": studentId }],
        }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Vos choix ont été enregistrés avec succès.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de l'enregistrement des choix.",
    });
  }
};

export const updateAcceptedPfa = async (req, res) => {
  try {
    const studentId = req.auth.userId;
    const { acceptedPfa } = req.body;

    if (!acceptedPfa) {
      return res.status(400).json({
        success: false,
        message: "Veuillez fournir un sujet accepté.",
      });
    }

    if (acceptedPfa) {
      const pfa = await pfaModel.findOne({ code_pfa: acceptedPfa });
      if (
        pfa.choices.some((c) => c.acceptedPfa?.etudiantsAcceptedIds?.length > 0)
      ) {
        return res.status(400).json({
          success: false,
          message: `Le sujet ${acceptedPfa} est déjà accepté par un autre étudiant ou binôme.`,
        });
      }
    }
    // Vérifier si l'étudiant a déjà accepté un autre sujet
    const existingAcceptedPfa = await pfaModel.findOne({
      "choices.acceptedPfa.etudiantsAcceptedIds": studentId, // Vérifie si l'étudiant a une acceptation
    });

    if (existingAcceptedPfa) {
      return res.status(400).json({
        success: false,
        message:
          "Vous avez déjà une acceptation pour un autre sujet. Vous ne pouvez pas en accepter un nouveau.",
      });
    }

    // Récupérer tous les choix de l'étudiant
    const pfas = await pfaModel.find({
      "choices.etudiantsIds": studentId, // Récupère tous les choix pour cet étudiant
    });

    if (!pfas.length) {
      return res.status(404).json({
        success: false,
        message: "Aucun choix trouvé pour cet étudiant.",
      });
    }

    // Vérifier si le sujet accepté fait partie des choix de l'étudiant
    const validPfa = pfas.find((pfa) =>
      pfa.choices.some(
        (choice) =>
          choice.etudiantsIds.includes(studentId) &&
          pfa.code_pfa === acceptedPfa &&
          !choice.acceptedPfa?.etudiantsAcceptedIds?.includes(studentId) // Vérifie que ce choix n'est pas déjà accepté par l'étudiant
      )
    );

    if (!validPfa) {
      return res.status(400).json({
        success: false,
        message:
          "Le sujet accepté doit être parmi vos choix et ne doit pas déjà être accepté.",
      });
    }

    // Mettre à jour le sujet accepté pour l'étudiant
    const updateResult = await pfaModel.updateOne(
      { code_pfa: acceptedPfa }, // Filtrer par code PFA
      {
        $set: {
          "choices.$[elem].acceptedPfa.etudiantsAcceptedIds": [studentId], // Met à jour les étudiants acceptés
        },
      },
      {
        arrayFilters: [{ "elem.etudiantsIds": studentId }], // Filtrer par l'étudiant qui a fait ce choix
      }
    );

    if (!updateResult.modifiedCount) {
      return res.status(500).json({
        success: false,
        message: "Impossible de mettre à jour le sujet accepté.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Le sujet accepté a été mis à jour avec succès.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message:
        "Une erreur est survenue lors de la mise à jour du sujet accepté.",
    });
  }
};

export const automatedAssignment = async (req, res) => {
  try {
    // Vérifier la période pour le type "PFA Project"
    const periode = await periodeModel.findOne({ type: "PFA Project" });
    if (!periode) {
      return res.status(400).json({
        success: false,
        message: "Période introuvable pour le type 'PFA Project'.",
      });
    }

    // Vérifier si la période de dépôt est terminée
    const currentDate = new Date();
    if (periode.Date_Fin_depot && currentDate <= periode.Date_Fin_depot) {
      return res.status(400).json({
        success: false,
        message:
          "La période de dépôt est encore ouverte. L'affectation automatique n'est pas autorisée.",
      });
    }
    const pfas = await pfaModel.find({ etatDepot: "published" });
    let affectedCount = 0;
    let assignedStudents = new Set();
    let notAssignedSubjects = []; // Nouveau tableau pour les sujets non affectés

    // Récupérer tous les étudiants ayant fait des choix (sans doublons)
    let nonAffectedStudents = new Set(
      pfas.flatMap((pfa) =>
        pfa.choices.flatMap((choice) =>
          choice.etudiantsIds.map((id) => id.toString())
        )
      )
    );

    for (const pfa of pfas) {
      // Ajouter les étudiants déjà affectés
      if (pfa.etudiants?.length) {
        pfa.etudiants.forEach((id) => assignedStudents.add(id.toString()));
        await pfaModel.updateOne(
          { code_pfa: pfa.code_pfa },
          { $set: { etatAffectation: "affected" } }
        );
        affectedCount++;
        continue;
      }

      // Vérifier si un choix a été explicitement accepté pour ce sujet
      const acceptedChoice = pfa.choices.find(
        (choice) => choice.acceptedPfa?.etudiantsAcceptedIds?.length
      );

      if (acceptedChoice) {
        // Récupérer les étudiants disponibles spécifiés dans acceptedPfa
        const availableStudents =
          acceptedChoice.acceptedPfa.etudiantsAcceptedIds.filter(
            (id) => !assignedStudents.has(id.toString())
          );

        if (availableStudents.length) {
          // Si le sujet est en binôme
          if (pfa.estBinome) {
            // Récupérer les binômes valides dans les étudiants acceptés
            const availableBinomes =
              acceptedChoice.acceptedPfa.binomeIds?.filter(
                (binome) =>
                  availableStudents.includes(binome.etudiantId) &&
                  availableStudents.includes(binome.binomeId) &&
                  !assignedStudents.has(binome.etudiantId.toString()) &&
                  !assignedStudents.has(binome.binomeId.toString())
              );

            if (availableBinomes?.length) {
              const selectedBinome =
                availableBinomes[
                  Math.floor(Math.random() * availableBinomes.length)
                ];

              // Mettre à jour le sujet avec les étudiants du binôme accepté
              await pfaModel.updateOne(
                { code_pfa: pfa.code_pfa },
                {
                  $set: {
                    etatAffectation: "affected",
                    etudiants: [
                      selectedBinome.etudiantId,
                      selectedBinome.binomeId,
                    ],
                  },
                }
              );

              // Ajouter ces étudiants à la liste des étudiants affectés
              assignedStudents.add(selectedBinome.etudiantId.toString());
              assignedStudents.add(selectedBinome.binomeId.toString());
              affectedCount++;
              continue; // Passer au sujet suivant
            }
          } else {
            // Si le sujet est individuel
            await pfaModel.updateOne(
              { code_pfa: pfa.code_pfa },
              {
                $set: {
                  etatAffectation: "affected",
                  etudiants: availableStudents,
                },
              }
            );

            // Ajouter ces étudiants à la liste des étudiants affectés
            availableStudents.forEach((id) =>
              assignedStudents.add(id.toString())
            );
            affectedCount++;
            continue; // Passer au sujet suivant
          }
        }
      }

      // Gérer les choix de priorité 1
      const priority1Choices = pfa.choices.filter(
        (choice) => choice.priority === 1
      );

      if (priority1Choices.length) {
        const selectedChoice =
          priority1Choices.length === 1
            ? priority1Choices[0]
            : priority1Choices[
                Math.floor(Math.random() * priority1Choices.length)
              ];

        if (pfa.estBinome) {
          // Projet en binôme
          const availableBinomes = selectedChoice.binomeIds.filter(
            (binome) =>
              !assignedStudents.has(binome.etudiantId.toString()) &&
              !assignedStudents.has(binome.binomeId.toString())
          );

          if (availableBinomes.length) {
            const selectedBinome =
              availableBinomes[
                Math.floor(Math.random() * availableBinomes.length)
              ];
            await pfaModel.updateOne(
              { code_pfa: pfa.code_pfa },
              {
                $set: {
                  etatAffectation: "affected",
                  etudiants: [
                    selectedBinome.etudiantId,
                    selectedBinome.binomeId,
                  ],
                },
              }
            );
            assignedStudents.add(selectedBinome.etudiantId.toString());
            assignedStudents.add(selectedBinome.binomeId.toString());
            affectedCount++;
            continue;
          }
        } else {
          // Projet individuel
          const availableStudents = selectedChoice.etudiantsIds.filter(
            (id) => !assignedStudents.has(id.toString())
          );

          if (availableStudents.length) {
            const selectedStudent =
              availableStudents[
                Math.floor(Math.random() * availableStudents.length)
              ];
            await pfaModel.updateOne(
              { code_pfa: pfa.code_pfa },
              {
                $set: {
                  etatAffectation: "affected",
                  etudiants: [selectedStudent],
                },
              }
            );
            assignedStudents.add(selectedStudent.toString());
            affectedCount++;
            continue;
          }
        }
      }

      // Parcourir les choix de priorité 2 et 3
      let assigned = false;
      for (let priority = 2; priority <= 3; priority++) {
        for (const choice of pfa.choices.filter(
          (c) => c.priority === priority
        )) {
          if (pfa.estBinome) {
            // Gestion binôme
            const availableBinomes = choice.binomeIds.filter(
              (binome) =>
                !assignedStudents.has(binome.etudiantId.toString()) &&
                !assignedStudents.has(binome.binomeId.toString())
            );

            if (availableBinomes.length) {
              const selectedBinome =
                availableBinomes[
                  Math.floor(Math.random() * availableBinomes.length)
                ];
              await pfaModel.updateOne(
                { code_pfa: pfa.code_pfa },
                {
                  $set: {
                    etatAffectation: "affected",
                    etudiants: [
                      selectedBinome.etudiantId,
                      selectedBinome.binomeId,
                    ],
                  },
                }
              );
              assignedStudents.add(selectedBinome.etudiantId.toString());
              assignedStudents.add(selectedBinome.binomeId.toString());
              affectedCount++;
              assigned = true;
              break;
            }
          } else {
            // Gestion individuelle
            const availableStudents = choice.etudiantsIds.filter(
              (id) => !assignedStudents.has(id.toString())
            );

            if (availableStudents.length) {
              const selectedStudent =
                availableStudents[
                  Math.floor(Math.random() * availableStudents.length)
                ];
              await pfaModel.updateOne(
                { code_pfa: pfa.code_pfa },
                {
                  $set: {
                    etatAffectation: "affected",
                    etudiants: [selectedStudent],
                  },
                }
              );
              assignedStudents.add(selectedStudent.toString());
              affectedCount++;
              assigned = true;
              break;
            }
          }
        }
        if (assigned) break;
      }

      // Marquer le PFA comme non assigné si aucun étudiant n'a été trouvé
      if (!assigned) {
        notAssignedSubjects.push(pfa);
        await pfaModel.updateOne(
          { code_pfa: pfa.code_pfa },
          { $set: { etatAffectation: "not affected" } }
        );
      }
    }

    // Mettre à jour la liste des étudiants non affectés
    nonAffectedStudents = new Set(
      [...nonAffectedStudents].filter((id) => !assignedStudents.has(id))
    );

    return res.status(200).json({
      success: true,
      message: `${affectedCount} sujets affectés automatiquement.`,
      nonAffectedStudents: Array.from(nonAffectedStudents),
      notAssignedSubjects,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de l'affectation automatique.",
    });
  }
};

export const manualAssignment = async (req, res) => {
  try {
    const periode = await periodeModel.findOne({ type: "PFA Project" });
    if (!periode) {
      return res.status(400).json({
        success: false,
        message: "Période introuvable pour le type 'PFA Project'.",
      });
    }

    // Vérifier si la période de dépôt est terminée
    const currentDate = new Date();
    if (periode.Date_Fin_depot && currentDate <= periode.Date_Fin_depot) {
      return res.status(400).json({
        success: false,
        message:
          "La période de dépôt est encore ouverte. L'affectation automatique n'est pas autorisée.",
      });
    }
    const { pfaId, studentId, secondStudentId } = req.params;
    const { force } = req.body;

    const pfa = await pfaModel.findById(pfaId);
    if (!pfa) {
      return res.status(404).json({
        success: false,
        message: "PFA non trouvé.",
      });
    }

    const foundEtudiant = await userModel.findById(studentId);
    if (!foundEtudiant) {
      return res.status(404).json({
        success: false,
        message: "Étudiant non trouvé.",
      });
    }

    if (foundEtudiant.niveau !== 2) {
      return res.status(400).json({
        success: false,
        message: "Vous ne pouvez affecter que des étudiants de niveau 2ING.",
      });
    }
    if (pfa.estBinome) {
      if (!secondStudentId) {
        return res.status(400).json({
          success: false,
          message: "Un deuxième étudiant est requis pour ce PFA.",
        });
      }

      const secondEtudiant = await userModel.findById(secondStudentId);
      if (!secondEtudiant) {
        return res.status(404).json({
          success: false,
          message: "Deuxième étudiant non trouvé.",
        });
      }

      if (secondEtudiant.niveau !== 2) {
        return res.status(400).json({
          success: false,
          message: "Le deuxième étudiant doit être en 2ING.",
        });
      }

      const existingPfaWithStudents = await pfaModel.findOne({
        etudiants: { $in: [studentId, secondStudentId] },
        etatAffectation: "affected",
      });

      if (
        existingPfaWithStudents &&
        existingPfaWithStudents._id.toString() !== pfaId
      ) {
        return res.status(400).json({
          success: false,
          message: "Un des étudiants est déjà affecté à un autre PFA.",
        });
      }

      pfa.etudiants = [studentId, secondStudentId];
    } else {
      const existingPfaWithStudent = await pfaModel.findOne({
        etudiants: studentId,
        etatAffectation: "affected",
      });

      if (
        existingPfaWithStudent &&
        existingPfaWithStudent._id.toString() !== pfaId
      ) {
        return res.status(400).json({
          success: false,
          message: "Cet étudiant est déjà affecté à un autre PFA.",
        });
      }

      // Vérifier si le PFA est déjà assigné
      if (pfa.etudiants?.length) {
        if (!force) {
          return res.status(400).json({
            success: false,
            message:
              "PFA déjà affecté. Utilisez force=true pour forcer l'affectation.",
          });
        }
        // Retirer l'étudiant actuel
        pfa.etudiants = pfa.etudiants.filter(
          (id) => id.toString() !== studentId
        );
      }

      // Ajouter le nouvel étudiant
      pfa.etudiants = [studentId];
    }
    pfa.etatAffectation = "affected";

    await pfa.save();

    return res.status(200).json({
      success: true,
      message: "PFA affecté avec succès.",
      pfa,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de l'affectation manuelle.",
    });
  }
};
export const ajouterSoutenance = async (req, res) => {
  try {
    // Étape 1 : Récupérer les sujets PFA publiés avec les enseignants
    const sujets = await pfaModel
      .find({ etatAffectation: "published" })
      .populate("enseignant etudiants", "nom prenom _id")
      .select("titreSujet enseignant etudiants");

    if (!sujets.length) {
      return res.status(404).json({
        message: "Aucun sujet PFA trouvé.",
      });
    }

    // Étape 2 : Vérification des étudiants associés à plusieurs sujets PFA
    const etudiantSujetMap = new Map(); // Stocke l'association étudiant -> sujet

    for (const sujet of sujets) {
      for (const etudiant of sujet.etudiants) {
        if (etudiantSujetMap.has(etudiant._id.toString())) {
          const autreSujet = etudiantSujetMap.get(etudiant._id.toString());
          return res.status(400).json({
            message: `L'étudiant ${etudiant.nom} ${etudiant.prenom} est déjà associé au sujet PFA "${autreSujet.titreSujet}".`,
          });
        }
        etudiantSujetMap.set(etudiant._id.toString(), sujet);
      }
    }

    // Étape 3 : Grouper les sujets par enseignant
    const sujetsParEnseignant = {};
    sujets.forEach((sujet) => {
      const enseignantId = sujet.enseignant._id.toString();
      if (!sujetsParEnseignant[enseignantId]) {
        sujetsParEnseignant[enseignantId] = [];
      }
      sujetsParEnseignant[enseignantId].push(sujet);
    });

    // Étape 4 : Assigner chaque enseignant comme rapporteur pour les sujets de l'autre
    const enseignantsIds = Object.keys(sujetsParEnseignant);
    if (enseignantsIds.length < 2) {
      return res.status(400).json({
        message:
          "Il faut au moins deux enseignants pour équilibrer les soutenances.",
      });
    }

    const soutenancesCrees = [];
    const dateInitiale = moment().add(7, "days"); // Soutenances prévues dans une semaine
    const heureDebutJournee = 8 * 60; // 09:00 en minutes
    const dureeSoutenance = 30; // 30 minutes par soutenance

    let dateSoutenance = moment(dateInitiale);
    let heureActuelle = heureDebutJournee;

    for (const enseignantId of enseignantsIds) {
      const sujetsEncadres = sujetsParEnseignant[enseignantId];

      // Trouver le rapporteur (l'autre enseignant)
      const autresEnseignants = enseignantsIds.filter(
        (id) => id !== enseignantId
      );
      const rapporteurId = autresEnseignants[0]; // Choix simple car deux enseignants seulement

      for (const sujet of sujetsEncadres) {
        const etudiants = sujet.etudiants.map((e) => e._id);

        let soutenancesMemeJour = await soutenancePfaModel.find({
          date_soutenance: {
            $gte: dateSoutenance.clone().startOf("day").toDate(),
            $lt: dateSoutenance.clone().endOf("day").toDate(),
          },
        });

        let creationReussie = false;
        while (!creationReussie) {
          if (soutenancesMemeJour.length >= 6) {
            dateSoutenance.add(1, "days");
            heureActuelle = heureDebutJournee;
            soutenancesMemeJour = [];
          }

          const heureDebut = moment(dateSoutenance).set({
            hours: Math.floor(heureActuelle / 60),
            minutes: heureActuelle % 60,
          });

          const heureFin = moment(heureDebut).add(dureeSoutenance, "minutes");

          if (heureFin.hour() >= 16) {
            dateSoutenance.add(1, "days");
            heureActuelle = heureDebutJournee;
            soutenancesMemeJour = [];
            continue;
          }

          // Vérifier conflits horaires
          const conflitHoraire = await soutenancePfaModel.findOne({
            date_soutenance: dateSoutenance.toDate(),
            salle: "Salle 1",
            $or: [
              {
                heure_soutenance: {
                  $gte: heureDebut.toDate(),
                  $lt: heureFin.toDate(),
                },
              },
              {
                finHeure: { $gt: heureDebut.toDate(), $lte: heureFin.toDate() },
              },
            ],
          });

          if (conflitHoraire) {
            heureActuelle += dureeSoutenance;
            continue;
          }

          // Créer la soutenance
          const soutenance = new soutenancePfaModel({
            pfa: sujet._id,
            etudiants,
            date_soutenance: dateSoutenance.toDate(),
            heure_soutenance: heureDebut.format("HH:mm"),
            finHeure: heureFin.format("HH:mm"),
            salle: "Salle 1",
            rapporteur: rapporteurId,
            enseignant: enseignantId,
          });

          await soutenance.save();

          const soutenancePopulee = await soutenance.populate(
            "enseignant rapporteur etudiants",
            "nom prenom _id"
          );

          soutenancesCrees.push(soutenancePopulee);

          heureActuelle += dureeSoutenance;
          soutenancesMemeJour = await soutenancePfaModel.find({
            date_soutenance: {
              $gte: dateSoutenance.clone().startOf("day").toDate(),
              $lt: dateSoutenance.clone().endOf("day").toDate(),
            },
          });

          creationReussie = true;
        }
      }
    }

    return res.status(200).json({
      message: "Soutenances automatiques créées avec succès.",
      soutenances: soutenancesCrees,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la création des soutenances automatiques :",
      error.message
    );
    return res.status(500).json({
      message: `Erreur serveur: ${error.message}`,
    });
  }
};

export const publishAffectedPfas = async (req, res) => {
  try {
    const response = req.params.response;

    if (!response) {
      return res.status(400).json({
        success: false,
        message: "Le paramètre 'response' est manquant.",
      });
    }

    if (response === "true") {
      const foundAffectedPfas = await pfaModel.find({
        etatAffectation: "affected",
      });

      if (foundAffectedPfas.length > 0) {
        await pfaModel.updateMany(
          { etatAffectation: "affected" },
          { etatAffectation: "published" }
        );

        return res.status(200).json({
          success: true,
          message: `${foundAffectedPfas.length} PFAs affectés publiés.`,
        });
      } else {
        return res.status(200).json({
          success: true,
          message: "Aucun PFA affecté à publier.",
        });
      }
    } else {
      await pfaModel.updateMany(
        { etatAffectation: "published" },
        { etatAffectation: "masked" }
      );

      return res.status(200).json({
        success: true,
        message: "Liste des PFA affectés masquée.",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la publication.",
    });
  }
};
export const modifierSoutenance = async (req, res) => {
  try {
    const { id } = req.params; // Récupération de l'ID de la soutenance depuis les paramètres
    const { date_soutenance, heure_soutenance, salle, rapporteur } = req.body; // Champs à modifier

    // Vérification de l'existence de la soutenance
    const soutenance = await soutenancePfaModel.findById(id);
    if (!soutenance) {
      return res.status(404).json({ message: "Soutenance introuvable." });
    }

    // Validation de l'ID du rapporteur si fourni
    if (rapporteur && !mongoose.Types.ObjectId.isValid(rapporteur)) {
      return res
        .status(400)
        .json({ message: "Identifiant du rapporteur invalide." });
    }

    // Vérification de l'existence du rapporteur
    if (rapporteur) {
      const rapporteurExist = await userModel.findById(rapporteur);
      if (!rapporteurExist) {
        return res
          .status(400)
          .json({ message: "Identifiant du rapporteur inexistant." });
      }
    }

    // Vérification si l'identifiant du rapporteur modifié est le même que l'enseignant
    if (rapporteur && rapporteur === soutenance.enseignant.toString()) {
      return res.status(400).json({
        message:
          "L'identifiant du rapporteur ne peut pas être le même que celui de l'enseignant.",
      });
    }

    // Vérification des soutenances encadrées et rapportées par le rapporteur modifié
    if (rapporteur) {
      const soutenancesEncadrant = await soutenancePfaModel.find({
        enseignant: rapporteur,
      });
      const soutenancesRapporteur = await soutenancePfaModel.find({
        rapporteur,
      });

      // Vérification que le rapporteur n'encadre pas plus de soutenances qu'il ne rapporte
      if (soutenancesEncadrant.length > soutenancesRapporteur.length) {
        return res.status(400).json({
          message:
            "Le rapporteur doit encadrer un nombre égal de soutenances à celles qu'il rapporte.",
        });
      }

      // Vérification que le rapporteur ne rapporte pas plus de soutenances qu'il en encadre
      if (soutenancesRapporteur.length > soutenancesEncadrant.length) {
        return res.status(400).json({
          message:
            "Le rapporteur ne peut pas rapporter plus de soutenances qu'il n'en encadre.",
        });
      }
    }

    // Déclaration de finHeureFormatted uniquement si heure_soutenance est fournie
    let finHeureFormatted;
    if (heure_soutenance) {
      const heureParts = heure_soutenance.split(":");
      const heureDebut = parseInt(heureParts[0]) * 60 + parseInt(heureParts[1]); // Convertir l'heure en minutes
      const finHeure = heureDebut + 30; // Durée de soutenance de 30 minutes

      if (heureDebut < 480 || finHeure > 960) {
        return res.status(400).json({
          message: "La soutenance doit être programmée entre 08:00 et 16:00.",
        });
      }

      finHeureFormatted = `${String(Math.floor(finHeure / 60)).padStart(
        2,
        "0"
      )}:${String(finHeure % 60).padStart(2, "0")}`;
    }

    // Vérification des conflits d'horaires dans la même salle
    if (salle && date_soutenance && heure_soutenance) {
      const conflitHoraire = await soutenancePfaModel.findOne({
        date_soutenance,
        salle,
        _id: { $ne: id }, // Exclure la soutenance actuelle
        $or: [
          {
            heure_soutenance: { $lt: finHeureFormatted }, // Vérifier que l'heure de début de la soutenance modifiée est avant la fin de l'autre
            finHeure: { $gt: heure_soutenance }, // Vérifier que la fin de l'autre soutenance est après l'heure de début
          },
          {
            heure_soutenance: { $gte: heure_soutenance }, // Vérifier que l'heure de début de la soutenance modifiée est après ou égale à celle de l'autre
            heure_soutenance: { $lt: finHeureFormatted }, // Vérifier que l'heure de début est avant la fin de l'autre
          },
        ],
      });

      if (conflitHoraire) {
        return res.status(400).json({
          message:
            "Conflit d'horaires avec une autre soutenance dans la même salle.",
        });
      }
    }

    // Vérification des conflits pour l'encadrant (enseignant) et le rapporteur (dans d'autres soutenances, même date et heure mais dans d'autres salles)
    if (rapporteur || heure_soutenance || salle) {
      const conflitEnseignantRapporteur = await soutenancePfaModel.findOne({
        date_soutenance,
        $or: [
          { enseignant: soutenance.enseignant }, // Vérification pour l'encadrant existant
          { rapporteur }, // Vérification pour le rapporteur modifié
        ],
        _id: { $ne: id }, // Exclure la soutenance actuelle
        salle: { $ne: salle }, // Vérification dans une autre salle
        $or: [
          {
            heure_soutenance: {
              $gte: heure_soutenance,
              $lt: finHeureFormatted,
            },
          },
          { finHeure: { $gt: heure_soutenance, $lte: finHeureFormatted } },
        ],
      });

      if (conflitEnseignantRapporteur) {
        return res.status(400).json({
          message:
            "L'encadrant ou le rapporteur est déjà engagé dans une autre soutenance à la même date et heure dans une autre salle.",
        });
      }
    }

    const soutenancesMemeJour = await soutenancePfaModel.find({
      date_soutenance: {
        $gte: new Date(date_soutenance).setHours(0, 0, 0, 0),
        $lt: new Date(date_soutenance).setHours(23, 59, 59, 999),
      },
      _id: { $ne: id },
    });

    if (soutenancesMemeJour.length >= 6) {
      return res.status(400).json({
        message: "Nombre maximal de soutenances atteint pour ce jour.",
      });
    }

    // Mise à jour des champs spécifiés uniquement s'ils sont présents dans la requête
    if (date_soutenance) soutenance.date_soutenance = date_soutenance;
    if (heure_soutenance) soutenance.heure_soutenance = heure_soutenance;
    if (salle) soutenance.salle = salle;

    // Mise à jour du rapporteur avec une vérification explicite
    if (rapporteur !== undefined) {
      soutenance.rapporteur =
        rapporteur === null ? soutenance.rapporteur : rapporteur;
    }

    if (finHeureFormatted) soutenance.finHeure = finHeureFormatted;

    await soutenance.save();

    // Retourne la soutenance mise à jour, avec la gestion correcte du rapporteur
    const updatedSoutenance = await soutenance.populate(
      "rapporteur",
      "nom prenom"
    );

    return res.status(200).json({
      message: "Soutenance mise à jour avec succès.",
      soutenance: updatedSoutenance,
    });
  } catch (error) {
    console.error("Erreur lors de la modification de la soutenance :", error);
    return res.status(500).json({ message: "Erreur serveur." });
  }
};

// Contrôleur pour publier ou masquer les soutenances
export const publierOuMasquerSoutenances = async (req, res) => {
  try {
    // Récupération du paramètre 'response' (publish ou hide)
    const { response } = req.params;

    // Validation de la valeur du paramètre
    if (!["publish", "hide"].includes(response)) {
      return res.status(400).json({
        message:
          "Paramètre invalide. Utilisez 'publish' pour publier ou 'hide' pour masquer les soutenances.",
      });
    }

    // Détermination de l'état en fonction du paramètre
    const isPublished = response === "publish";

    // Mise à jour de toutes les soutenances
    const result = await soutenancePfaModel.updateMany(
      {}, // Aucune condition : toutes les soutenances
      { isPublished }, // Mise à jour de l'état de publication
      { new: true }
    );

    // Vérification si des soutenances existent
    if (result.modifiedCount === 0) {
      return res.status(404).json({
        message: "Aucune soutenance trouvée à publier ou masquer.",
      });
    }

    // Retourner une réponse en fonction de l'action
    return res.status(200).json({
      message: isPublished
        ? "Toutes les soutenances ont été publiées avec succès."
        : "Toutes les soutenances ont été masquées avec succès.",
      result,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la publication/masquage des soutenances :",
      error.message
    );
    return res.status(500).json({
      message: `Erreur serveur : ${error.message}`,
    });
  }
};

export const sendPlanningSoutenances = async (req, res) => {
  try {
    const { typeEnvoi } = req.body; // "first" ou "modified"
    if (!["first", "modified"].includes(typeEnvoi)) {
      return res.status(400).json({
        message: "Type d'envoi invalide. Utilisez 'first' ou 'modified'.",
      });
    }

    // Récupérer toutes les soutenances
    const soutenances = await soutenancePfaModel
      .find({}) // Rechercher toutes les soutenances
      .populate(
        "etudiants enseignant rapporteur",
        "adresseEmail nom prenom _id"
      );

    if (!soutenances.length) {
      return res.status(400).json({
        message: "Aucune soutenance trouvée dans la base de données.",
      });
    }

    // Construire la liste des destinataires
    const emails = new Set(); // Utilisation d'un Set pour éviter les doublons

    soutenances.forEach((soutenance) => {
      if (soutenance.etudiants) {
        soutenance.etudiants.forEach((etudiant) =>
          emails.add(etudiant.adresseEmail)
        );
      }
      if (soutenance.enseignant) {
        emails.add(soutenance.enseignant.adresseEmail);
      }
      if (soutenance.rapporteur) {
        emails.add(soutenance.rapporteur.adresseEmail);
      }
    });

    if (!emails.size) {
      return res
        .status(200)
        .json({ message: "Aucun email à envoyer pour les soutenances." });
    }

    // Configurer le transporteur SMTP
    const smtpTransport = nodemailer.createTransport({
      host: process.env.HOST, // Défini dans votre .env
      port: process.env.PORT_SSL, // Port SSL
      secure: true, // Utilisation de SSL
      auth: {
        user: process.env.MAILER_EMAIL_ID, // Email pour l'authentification
        pass: process.env.MAILER_PASSWORD, // Mot de passe d'application
      },
    });

    // Vérifier la configuration SMTP avant l'envoi
    await smtpTransport.verify();

    // Contenu des emails selon le type d'envoi
    const emailSubject =
      typeEnvoi === "first"
        ? "Planning des soutenances de PFAs"
        : "Mise à jour du planning des soutenances de PFAs";

    const emailHtml =
      typeEnvoi === "first"
        ? `Bonjour,<br/><br/>
          Nous avons le plaisir de vous informer que le planning des soutenances de PFAs a été publié. <br/>
          Vous pouvez consulter les détails du planning en suivant le lien ci-dessous :<br/><br/>
          <a href="${process.env.API_ENDPOINT}/planning-soutenances" target="_blank" style="color: #007bff; text-decoration: none; font-weight: bold;">
            Accéder au planning des soutenances
          </a><br/><br/>
          Cordialement,<br/>
          L’équipe de coordination des PFAs.`
        : `Bonjour,<br/><br/>
          Nous vous informons que le planning des soutenances de PFAs a été mis à jour. <br/>
          Veuillez consulter les modifications en suivant le lien ci-dessous :<br/><br/>
          <a href="${process.env.API_ENDPOINT}/planning-soutenances" target="_blank" style="color: #007bff; text-decoration: none; font-weight: bold;">
            Accéder au planning mis à jour
          </a><br/><br/>
          Cordialement,<br/>
          L’équipe de coordination des PFAs.`;

    // Envoi des emails
    const mailOptions = {
      from: process.env.MAILER_EMAIL_ID,
      to: [...emails], // Conversion du Set en tableau
      subject: emailSubject,
      html: emailHtml,
    };

    await smtpTransport.sendMail(mailOptions);

    // Mettre à jour l'état de chaque soutenance après l'envoi des emails
    const updateConditions =
      typeEnvoi === "first"
        ? { emailSent: true } // Ajouter emailSent: true pour le premier envoi
        : { isSecondSend: true }; // Mettre isSecondSend à true pour un envoi modifié

    // Mettre à jour l'état des soutenances dans la base de données
    await soutenancePfaModel.updateMany({}, { $set: updateConditions });

    return res.status(200).json({
      success: true,
      message: `Emails envoyés avec succès pour le planning des soutenances (${
        typeEnvoi === "first" ? "première publication" : "mise à jour"
      }).`,
    });
  } catch (error) {
    console.error("Erreur :", error.message);
    return res.status(500).json({
      success: false,
      message: "Une erreur s'est produite lors de l'envoi des emails.",

      error: error.message,
    });
  }
};

export const sendListePfaAffected = async (req, res) => {
  try {
    // Trouver les étudiants au niveau 2ING
    const foundEtudiants = await userModel.find({
      $and: [{ role: "etudiant" }, { niveau: 2 }],
    });

    if (!foundEtudiants.length) {
      return res.status(400).json({ message: "Aucun étudiant trouvé." });
    }

    // Trouver les enseignants ayant déposé des sujets PFA
    const teachersWithPfa = await userModel.find({
      role: "enseignant",
      _id: {
        $in: (
          await pfaModel
            .find({ enseignant: { $ne: null } })
            .select("enseignant")
        ).map((pfa) => pfa.enseignant),
      },
    });

    if (!teachersWithPfa.length) {
      return res.status(400).json({ message: "Aucun enseignant trouvé." });
    }

    // Séparer les étudiants en deux groupes
    const etudiantsFirstSend = foundEtudiants.filter(
      (etudiant) => !etudiant.isFirstSendListePfa
    );
    const etudiantsAlreadySent = foundEtudiants.filter(
      (etudiant) => etudiant.isFirstSendListePfa
    );

    // Séparer les enseignants en deux groupes
    const enseignantsFirstSend = teachersWithPfa.filter(
      (enseignant) => !enseignant.isFirstSendListePfa
    );
    const enseignantsAlreadySent = teachersWithPfa.filter(
      (enseignant) => enseignant.isFirstSendListePfa
    );

    // Construire les listes d'emails
    const emailsFirstSend = [
      ...etudiantsFirstSend.map((etudiant) => etudiant.adresseEmail),
      ...enseignantsFirstSend.map((enseignant) => enseignant.adresseEmail),
    ];

    const emailsAlreadySent = [
      ...etudiantsAlreadySent.map((etudiant) => etudiant.adresseEmail),
      ...enseignantsAlreadySent.map((enseignant) => enseignant.adresseEmail),
    ];

    if (!emailsFirstSend.length && !emailsAlreadySent.length) {
      return res
        .status(200)
        .json({ message: "Tous les emails ont déjà été envoyés." });
    }

    // Configuration du transporteur SMTP
    const smtpTransport = nodemailer.createTransport({
      host: process.env.HOST,
      port: process.env.PORT_SSL,
      secure: false,
      service: process.env.MAILER_SERVICE_PROVIDER,
      auth: {
        user: FROM_EMAIL,
        pass: AUTH_PASSWORD,
      },
    });

    // Contenu des emails
    const firstSendHtml = `
   <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h1 style="color: #007bff;">Bonjour,</h1>
  <p>
    Nous avons le plaisir de vous informer que la liste d'affectation aux sujets pour les 
    <strong>Projets de Fin d’Année (PFAs)</strong> a été publiée.
  </p>
  <p>
    Vous pouvez consulter les détails des affectations en suivant le lien ci-dessous :
  </p>
  <div style="margin: 20px 0; text-align: center;">
    <a href="${API_ENDPOINT}/getAssignedPfas" 
       target="_blank" 
       style="display: inline-block; background-color: #007bff; color: #fff; text-decoration: none; 
              font-weight: bold; padding: 10px 20px; border-radius: 5px;">
      Accéder à la liste d'affectation
    </a>
  </div>
  <p>
    Cordialement,<br/>
    <em>L’équipe de coordination des PFAs</em>
  </p>
  <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
  <footer style="font-size: 0.9em; color: #555;">
    Ceci est un message automatique. Merci de ne pas répondre à cet e-mail.
  </footer>
</div>

    `;

    const updatedSendHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h1 style="color: #007bff;">Bonjour,</h1>
  <p>
    Nous avons le plaisir de vous informer que la liste d'affectation aux sujets pour les 
    <strong>Projets de Fin d’Année (PFAs)</strong> a été mise à jour .
  </p>
  <p>
    Vous pouvez consulter les détails des affectations en suivant le lien ci-dessous :
  </p>
  <div style="margin: 20px 0; text-align: center;">
    <a href="${API_ENDPOINT}/getAssignedPfas" 
       target="_blank" 
       style="display: inline-block; background-color: #007bff; color: #fff; text-decoration: none; 
              font-weight: bold; padding: 10px 20px; border-radius: 5px;">
      Accéder à la liste d'affectation
    </a>
  </div>
  <p>
    Cordialement,<br/>
    <em>L’équipe de coordination des PFAs</em>
  </p>
  <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
  <footer style="font-size: 0.9em; color: #555;">
    Ceci est un message automatique. Merci de ne pas répondre à cet e-mail.
  </footer>
</div>
    `;

    // Fonction d'envoi d'emails
    const sendEmail = async (destinataires, subject, htmlContent) => {
      const mailOptions = {
        from: FROM_EMAIL,
        to: destinataires,
        subject,
        html: htmlContent,
      };

      return smtpTransport.sendMail(mailOptions);
    };

    // Envoi des emails
    if (emailsFirstSend.length) {
      await sendEmail(
        emailsFirstSend,
        "Liste des affectations aux sujets des PFAs désormais disponible",
        firstSendHtml
      );

      // Mettre à jour le statut `isFirstSend` pour étudiants et enseignants
      const firstSendIds = [
        ...etudiantsFirstSend.map((etudiant) => etudiant._id),
        ...enseignantsFirstSend.map((enseignant) => enseignant._id),
      ];

      await userModel.updateMany(
        { _id: { $in: firstSendIds } },
        { $set: { isFirstSendListePfa: true } }
      );
    }

    if (emailsAlreadySent.length) {
      await sendEmail(
        emailsAlreadySent,
        "Mise à jour des affectations aux sujets des Projets de Fin d’Année (PFAs)",
        updatedSendHtml
      );
    }

    return res
      .status(200)
      .json({ success: true, message: "Emails envoyés avec succès." });
  } catch (error) {
    console.error("Erreur :", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const fetchAssignedPfa = async (req, res) => {
  try {
    const studentId = req.auth.userId;

    const foundEtudiant = await userModel.findOne({
      $and: [{ _id: studentId }, { niveau: 2 }],
    });

    if (!foundEtudiant) {
      return res
        .status(400)
        .json({ message: " pas encore des étudiants en 2 eme " });
    }
    const sujetsPfa = await pfaModel.find({
      etatAffectation: "published",
    });

    if (sujetsPfa.length === 0) {
      res.status(400).json({ message: " pas encore de sujets pfa publiés" });
    } else {
      res
        .status(200)
        .json({ model: sujetsPfa, message: " Les sujets pfas publiés" });
    }
  } catch (error) {
    console.error("Erreur :", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
export const fetchPlanningSoutenances = async (req, res) => {
  try {
    const { enseignantId, etudiantId } = req.query;

    // Vérifier si des critères de filtrage sont fournis
    if (!enseignantId && !etudiantId) {
      return res.status(400).json({
        message: "Veuillez spécifier un filtre : enseignantId ou etudiantId.",
      });
    }

    // Construire le filtre en fonction des paramètres de requête
    const filtre = {};

    if (enseignantId) {
      // Filtrer les soutenances où l'enseignant est soit encadrant, soit rapporteur
      filtre.$or = [{ enseignant: enseignantId }, { rapporteur: enseignantId }];
    }

    if (etudiantId) {
      // Ajouter un filtre pour les étudiants
      filtre.etudiants = etudiantId;
    }

    // Récupérer les plannings des soutenances avec les filtres
    const plannings = await soutenancePfaModel
      .find(filtre)
      .populate("enseignant rapporteur etudiants", "nom prenom _id")
      .populate("pfa", "titreSujet")
      .select("date_soutenance heure_soutenance salle");

    // Vérifier s'il y a des soutenances correspondant aux critères
    if (plannings.length === 0) {
      return res.status(404).json({
        message: "Aucune soutenance trouvée pour les critères spécifiés.",
      });
    }

    // Retourner les plannings trouvés
    res.status(200).json({
      model: plannings,
      message: "Plannings des soutenances récupérés avec succès.",
    });
  } catch (error) {
    // Gestion des erreurs

    res.status(500).json({
      message: error.message,
    });
  }
};

export const fetchMyPfa = async (req, res) => {
  try {
    const studentId = req.auth.userId;

    const foundEtudiant = await userModel.findOne({
      _id: studentId,
      niveau: 2,
    });

    if (!foundEtudiant) {
      return res
        .status(400)
        .json({ message: "Vous n'êtes pas encore un étudiant en 2ème année." });
    }

    // Rechercher les sujets PFA affectés à cet étudiant
    const sujetsPfa = await pfaModel
      .find({
        etudiants: studentId,
      })
      .populate("enseignant", "nom prenom email") // Charger les détails de l'enseignant
      .populate("etudiants", "nom prenom email"); // Charger les détails des étudiants du binôme s'il y en a

    if (sujetsPfa.length === 0) {
      return res
        .status(400)
        .json({ message: "Aucun sujet PFA ne vous a encore été affecté." });
    }

    res.status(200).json({
      success: true,
      model: sujetsPfa,
      message:
        "Voici les informations sur le sujet PFA qui vous a été affecté.",
    });
  } catch (error) {
    res.status(500).json({
      message:
        "Une erreur est survenue lors de la récupération des informations.",
      error: error.message,
    });
  }
};
