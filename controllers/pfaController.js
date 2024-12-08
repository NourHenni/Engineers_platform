import pfaModel from "../models/pfaModel.js";
import userModel from "../models/userModel.js";
import Periode from "../models/periodeModel.js";
import moment from "moment";
import periodeModel from "../models/periodeModel.js";

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

// Contrôleur pour ajouter une période
export const addPeriode = async (req, res) => {
  try {
    const { dateDebut, dateFin } = req.body;

    // Validation des données
    if (!dateDebut || !dateFin) {
      return res
        .status(400)
        .json({ message: "Les dates début et fin sont requises." });
    }
    if (new Date(dateDebut) >= new Date(dateFin)) {
      return res
        .status(400)
        .json({ message: "La date de début doit être avant la date de fin." });
    }

    // Vérifier si une période existe déjà dans la plage spécifiée
    const periodeExistante = await Periode.findOne({
      $or: [
        { Date_Debut: { $lte: new Date(dateFin), $gte: new Date(dateDebut) } },
        { Date_Fin: { $lte: new Date(dateFin), $gte: new Date(dateDebut) } },
      ],
    });

    if (periodeExistante) {
      return res
        .status(400)
        .json({ message: "Une période existe déjà pour ces dates." });
    }

    // Créer une nouvelle période
    const nouvellePeriode = new Periode({
      Nom: "PFA",
      Date_Debut: dateDebut,
      Date_Fin: dateFin,
    });

    await nouvellePeriode.save();
    res.status(201).json({
      message: "Période ajoutée avec succès.",
      periode: nouvellePeriode,
    });
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
      return res.status(404).json({ error: "Aucune période trouvée." });
    }

    // Retourner les périodes
    res.status(200).json({ periodes });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des périodes:",
      error.message
    );
    res.status(500).json({ error: "Erreur serveur. Réessayez plus tard." });
  }
};

// Contrôleur pour modifier les délais de dépôt
export const updateDelais = async (req, res) => {
  try {
    const { dateDebut, dateFin } = req.body;

    // Vérification des champs obligatoires
    if (!dateDebut || !dateFin) {
      return res
        .status(400)
        .json({ error: "Les champs 'dateDebut' et 'dateFin' sont requis." });
    }

    // Vérifier que la dateDebut est avant la dateFin
    if (new Date(dateDebut) >= new Date(dateFin)) {
      return res.status(400).json({
        error: "La date de début doit être antérieure à la date de fin.",
      });
    }

    // Trouver la période ouverte
    const periode = await Periode.findOne({ Nom: "PFA" }); // Supposons qu'il y ait une période spécifique pour "PFA"

    if (!periode) {
      return res.status(404).json({ error: "Période non trouvée." });
    }

    // Mise à jour des dates
    periode.Date_Debut = new Date(dateDebut);
    periode.Date_Fin = new Date(dateFin);
    await periode.save();

    res
      .status(200)
      .json({ message: "Les délais ont été mis à jour avec succès.", periode });
  } catch (error) {
    console.error("Erreur lors de la mise à jour des délais :", error.message);
    res
      .status(500)
      .json({ error: "Erreur serveur. Veuillez réessayer plus tard." });
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
    const sujetPFA = await pfaModel.findOne({ _id: req.params.idPFA });
    if (!sujetPFA) {
      res
        .status(400)
        .json({ message: "Sujet pfa inexistant  veuillez vérifier !!" });
    } else {
      const userRole = req.auth.role;

      if (userRole === "admin") {
        res.status(200).json({ model: sujetPFA, message: " Le sujet PFA est" });
      } else if (userRole === "etudiant") {
        const { updatedAt, createdAt, _id, etatDepot, ...newPfa } =
          sujetPFA.toObject();
        res.status(200).json({
          model: newPfa,
          message: "success",
        });
      } else {
        return res.status(403).json({
          success: false,
          message: "Accès refusé",
        });
      }
    }
  } catch (error) {
    res.status(500).json({
      message: error.message,
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

    if (response == true) {
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
