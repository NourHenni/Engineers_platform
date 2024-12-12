import pfaModel from "../models/pfaModel.js";
import userModel from "../models/userModel.js";
import Periode from "../models/periodeModel.js";

import User from "../models/userModel.js";

import moment from "moment";
import periodeModel from "../models/periodeModel.js";
import nodemailer from "nodemailer";

const FROM_EMAIL = process.env.MAILER_EMAIL_ID;
const AUTH_PASSWORD = process.env.MAILER_PASSWORD;

const API_ENDPOINT =
  process.env.NODE_ENV === "production"
    ? process.env.PRODUCTION_API_URL
    : process.env.DEVELOPMENT_API_URL;

export const addPeriod = async (req, res) => {
  try {
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
      });
      const foundPeriodType = await periodeModel.findOne({ type: period.type });
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

// Contrôleur pour récupérer les informations sur les périodes
export const getPeriodes = async (req, res) => {
  try {
    // Récupérer toutes les périodes depuis la base de données
    const periodes = await Periode.find();

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
    const { dateDebut, dateFin } = req.body;

    // Vérification des champs obligatoires
    if (!dateFin) {
      return res.status(400).json({ error: "Le champ 'dateFin' est requis." });
    }

    // Recherche de la période spécifique (exemple : "PFA")
    const periode = await Periode.findOne({ type: "PFA Project" });

    if (!periode) {
      return res.status(404).json({ error: "Periode introuvable." });
    }

    // Vérification si la période a commencé
    const now = new Date();
    // Vérification si la date de fin est dépassée
    if (now >= periode.Date_Fin) {
      return res.status(400).json({ error: "Délai dépassé." });
    }
    if (now >= periode.Date_Debut) {
      if (
        dateDebut &&
        new Date(dateDebut).getTime() !== periode.Date_Debut.getTime()
      ) {
        return res.status(400).json({
          error:
            "La periode a commence. La date de debut ne peut pas être modifiee.",
        });
      }
    }

    // Vérifier que la dateDebut est avant la dateFin (si modifiable)
    if (dateDebut && new Date(dateDebut) >= new Date(dateFin)) {
      return res.status(400).json({
        error: "La date de debut doit être anterieure à la date de fin.",
      });
    }

    // Mise à jour de la date de fin uniquement
    if (dateFin) {
      periode.Date_Fin = new Date(dateFin);
      await periode.save();

      res.status(200).json({
        message: "Les delais ont ete mis à jour avec succes.",
        periode,
      });
    }
  } catch (error) {
    console.error("Erreur lors de la mise à jour des delais :", error.message);
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
      nomEtudiant,
      prenomEtudiant,
    } = req.body;

    // Vérification des données obligatoires
    if (!titreSujet || !description || !technologies) {
      return res.status(400).json({ message: "Champs requis manquants." });
    }

    // Vérification du rôle de l'utilisateur connecté
    if (req.auth.role !== "enseignant") {
      return res.status(403).json({
        message: "Accès interdit : seul un enseignant peut déposer un sujet.",
      });
    }

    // Vérification de la période
    const periode = await Periode.findOne({ Nom: "PFA" });

    if (!periode) {
      return res
        .status(404)
        .json({ message: "Aucune période trouvée pour le PFA." });
    }

    const now = new Date();
    if (now < periode.Date_Debut || now > periode.Date_Fin) {
      return res.status(400).json({
        message: "La période n'est pas active ou est dépassée.",
      });
    }

    let etudiantId = null;

    // Si le nom et le prénom de l'étudiant sont fournis, chercher l'étudiant
    if (nomEtudiant && prenomEtudiant) {
      const etudiant = await User.findOne({
        nom: nomEtudiant,
        prenom: prenomEtudiant,
        role: "etudiant", // Vérifier également que l'utilisateur a le rôle "etudiant"
      });

      if (!etudiant) {
        return res
          .status(404)
          .json({ message: "Étudiant introuvable ou non valide." });
      }

      etudiantId = etudiant._id; // Associer l'étudiant trouvé
    }

    // Générer un code PFA au format PFA2024-01
    const generateCodePfa = async () => {
      const currentYear = new Date().getFullYear(); // Année actuelle
      const lastPfa = await pfaModel.findOne().sort({ _id: -1 }); // Dernier sujet enregistré

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
      code_pfa: codePfa, // Ajouter le code PFA généré
      titreSujet,
      description,
      technologies,
      estBinome,
      enseignant: req.auth.userId, // Associer l'enseignant connecté
      etudiant: etudiantId, // Null si aucun étudiant n'est fourni
    });

    // Sauvegarde du sujet PFA
    await nouveauPfa.save();

    // Utilisation de populate pour inclure les informations de l'enseignant
    const sujetAvecEnseignant = await pfaModel
      .findById(nouveauPfa._id)
      .populate("enseignant");

    res.status(201).json({
      message: "Sujet PFA ajouté avec succès.",
      sujet: sujetAvecDetails,
    });
  } catch (error) {
    console.error("Erreur :", error.message);
    res.status(500).json({ message: "Erreur serveur." });
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
    const { titreSujet, description, technologies, estBinome } = req.body;

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

    // Vérifier si la période a déjà commencé et que les dates sont dépassées
    const periodePfa = await Periode.findOne({ Nom: "PFA" });

    if (periodePfa && new Date() >= new Date(periodePfa.Date_Fin)) {
      return res.status(400).json({
        message: "Le délai de modification est dépassé.",
      });
    }

    // Mettre à jour les informations du sujet PFA
    if (titreSujet) sujet.titreSujet = titreSujet;
    if (description) sujet.description = description;
    if (technologies) sujet.technologies = technologies;
    if (estBinome !== undefined) sujet.estBinome = estBinome;

    await sujet.save(); // Sauvegarder les modifications

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

    // Vérification de la période de dépôt pour voir si le délai est dépassé
    const periode = await Periode.findOne({ Nom: "PFA" });

    if (!periode) {
      return res.status(404).json({
        message: "Aucune période de dépôt PFA trouvée.",
      });
    }

    const currentDate = new Date();
    if (currentDate > periode.Date_Fin) {
      return res.status(400).json({
        message: "Le délai de suppression est dépassé.",
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
        const sujets = await Pfa.find({ enseignant: enseignant._id }).select(
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

    const userId = req.auth.userId; // ID de l'utilisateur connecté
    const userRole = req.auth.role; // Rôle de l'utilisateur connecté (par exemple : "admin", "etudiant", etc.)

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
        niveau: "2ING",
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
    console.log(response);

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
      return res.status(200).send("Liste des PFA masquée.");
    }
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const sendListePfa = async (req, res) => {
  try {
    // Trouver les étudiants au niveau 2ING
    const foundEtudiants = await userModel.find({
      $and: [{ role: "etudiant" }, { niveau: "2ING" }],
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

    console.log(teachersWithPfa);

    if (!teachersWithPfa.length) {
      return res.status(400).json({ message: "Aucun enseignant trouvé." });
    }

    // Séparer les étudiants en deux groupes
    const etudiantsFirstSend = foundEtudiants.filter(
      (etudiant) => !etudiant.isFirstSend
    );
    const etudiantsAlreadySent = foundEtudiants.filter(
      (etudiant) => etudiant.isFirstSend
    );

    // Séparer les enseignants en deux groupes
    const enseignantsFirstSend = teachersWithPfa.filter(
      (enseignant) => !enseignant.isFirstSend
    );
    const enseignantsAlreadySent = teachersWithPfa.filter(
      (enseignant) => enseignant.isFirstSend
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
        { $set: { isFirstSend: true } }
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
      $and: [{ _id: studentId }, { niveau: "2ING" }],
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
    const studentId = req.auth.userId; // ID de l'étudiant récupéré via JWT
    const { choices, binomeId, acceptedPfa } = req.body; // Liste des choix et ID unique du binôme (s'il existe)

    const foundEtudiant = await userModel.findOne({
      $and: [{ _id: studentId }, { niveau: "2ING" }],
    });

    if (!foundEtudiant) {
      return res.status(400).json({
        message: " seul les étudiants en 2eme peuvent choisir des sujets PFA ",
      });
    }

    // Vérifier si l'étudiant a déjà effectué des choix
    const existingChoices = await pfaModel.findOne({
      "choices.etudiantId": studentId,
    });

    if (existingChoices) {
      return res.status(400).json({
        success: false,
        message:
          "Vous avez déjà fait vos choix. Vous ne pouvez pas en faire de nouveaux.",
      });
    }

    // Validation 1 : Vérifier qu'il y a exactement 3 choix
    if (!choices || choices.length !== 3) {
      return res.status(400).json({
        success: false,
        message:
          "Vous devez choisir exactement 3 sujets avec des priorités différentes.",
      });
    }

    // Validation 2 : Vérifier que les priorités sont uniques
    const uniquePriorities = new Set(choices.map((choice) => choice.priority));
    if (uniquePriorities.size !== 3) {
      return res.status(400).json({
        success: false,
        message: "Les priorités des sujets doivent être uniques.",
      });
    }

    // Validation 3 : Vérifier qu'un étudiant ne choisit pas le même sujet avec toutes les priorités
    const uniqueSubjects = new Set(choices.map((choice) => choice.codePfa));
    if (uniqueSubjects.size !== 3) {
      return res.status(400).json({
        success: false,
        message:
          "Vous ne pouvez pas choisir le même sujet avec des priorités différentes.",
      });
    }

    // Validation 4 : Si un binôme est fourni, vérifier sa validité
    if (binomeId) {
      const binome = await userModel.findOne({
        _id: binomeId,
        role: "etudiant",
      });

      if (!binome) {
        return res.status(400).json({
          success: false,
          message:
            "Le binôme fourni n'existe pas ou n'a pas le rôle 'etudiant'.",
        });
      }

      if (binomeId === studentId) {
        return res.status(400).json({
          success: false,
          message: "Le binôme ne peut pas être le même étudiant.",
        });
      }
    }

    // Validation 5 : Vérifier chaque sujet
    for (const choice of choices) {
      const pfa = await pfaModel.findOne({ code_pfa: choice.codePfa });

      if (!pfa) {
        return res.status(404).json({
          success: false,
          message: `Le sujet avec le code ${choice.codePfa} est introuvable.`,
        });
      }

      // Vérifier si le sujet nécessite un binôme mais qu'aucun n'a été fourni
      if (pfa.estBinome && !binomeId) {
        return res.status(400).json({
          success: false,
          message: `Le code ${pfa.code_pfa} du sujet ${pfa.titreSujet} nécessite un binôme. Veuillez entrer l'ID de votre binôme.`,
        });
      }

      // Validation : Vérifier si le sujet est déjà choisi avec la même priorité par un autre étudiant
      const existingChoice = await pfaModel.findOne({
        code_pfa: choice.codePfa, // Sujet spécifique
        choices: {
          $elemMatch: {
            priority: choice.priority, // Priorité spécifique
            etudiantId: { $ne: studentId }, // Exclure l'étudiant actuel
            ...(binomeId && { binomeId: { $ne: binomeId } }), // Exclure si c'est validé par le binôme
          },
        },
      });

      if (existingChoice) {
        return res.status(400).json({
          success: false,
          message: `Le sujet ${choice.codePfa} avec la priorité ${choice.priority} est déjà choisi par un autre étudiant. Veuillez choisir un autre sujet ou une autre priorité.`,
        });
      }

      // Validation 6 : Vérifier si le sujet est déjà affecté
      if (pfa.etatAffectation === "affected") {
        return res.status(400).json({
          success: false,
          message: `Le code ${pfa.code_pfa} du sujet ${pfa.titreSujet} est déjà affecté. Veuillez choisir un autre sujet.`,
        });
      }
    }
    // Validation 6 : Vérifier que le sujet accepté est parmi les choix
    if (acceptedPfa) {
      const acceptedChoice = choices.find(
        (choice) => choice.codePfa === acceptedPfa
      );
      if (!acceptedChoice) {
        return res.status(400).json({
          success: false,
          message: "Le sujet accepté doit faire partie de vos choix.",
        });
      }
    }
    await Promise.all(
      choices.map(async (choice) => {
        const pfa = await pfaModel.findOne({ code_pfa: choice.codePfa });

        // Définir le binomeId uniquement si le sujet nécessite un binôme
        const choiceData = {
          etudiantId: studentId,
          priority: choice.priority,
          binomeId: pfa.estBinome ? binomeId || null : null,
        };

        // Ajouter le choix au sujet pour l'étudiant principal
        await pfaModel.updateOne(
          { code_pfa: choice.codePfa },
          {
            $addToSet: { choices: choiceData },
          },
          { runValidators: true }
        );

        // Si le sujet nécessite un binôme, ajouter le choix également pour le binôme
        if (pfa.estBinome && binomeId) {
          const binomeChoiceData = {
            etudiantId: binomeId,
            priority: choice.priority,
            binomeId: studentId, // Ajouter l'ID du principal comme binôme
          };

          await pfaModel.updateOne(
            { code_pfa: choice.codePfa },
            {
              $addToSet: { choices: binomeChoiceData },
            },
            { runValidators: true }
          );
        }
      })
    );
    // Mettre à jour le sujet accepté
    if (acceptedPfa) {
      await pfaModel.updateOne(
        { code_pfa: acceptedPfa },
        { $set: { etatAffectation: "affected" } }
      );
    }

    // Réponse finale après le traitement de tous les choix
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
    const studentId = req.auth.userId; // ID de l'étudiant récupéré via JWT
    const { acceptedPfa } = req.body; // Sujet accepté fourni par le corps de la requête

    if (!acceptedPfa) {
      return res.status(400).json({
        success: false,
        message: "Veuillez fournir un sujet accepté.",
      });
    }

    // Rechercher tous les PFAs contenant des choix faits par cet étudiant
    const pfas = await pfaModel.find({
      "choices.etudiantId": studentId,
    });

    if (!pfas.length) {
      return res.status(404).json({
        success: false,
        message: "Aucun choix trouvé pour cet étudiant.",
      });
    }

    // Vérifier si le sujet accepté fait partie des choix valides de l'étudiant
    const isValidChoice = pfas.some((pfa) =>
      pfa.choices.some(
        (choice) =>
          choice.etudiantId.toString() === studentId &&
          choice.acceptedPfa === undefined &&
          pfa.code_pfa === acceptedPfa // Vérifie si le code du PFA correspond
      )
    );

    if (!isValidChoice) {
      return res.status(400).json({
        success: false,
        message: "Le sujet accepté doit être parmi vos choix.",
      });
    }

    // Mettre à jour le sujet accepté et définir l'état comme "affecté"
    const updateResult = await pfaModel.updateOne(
      { code_pfa: acceptedPfa, "choices.etudiantId": studentId },
      {
        $set: {
          "choices.$.acceptedPfa": acceptedPfa, // Ajoute le sujet accepté au choix
          etatAffectation: "affected", // Marque le sujet comme affecté
        },
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
