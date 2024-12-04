import pfaModel from "../models/pfaModel.js";
import userModel from "../models/userModel.js";
import Periode from "../models/periodeModel.js";

export const fetchPfas = async (req, res) => {
  try {
    if (req.auth.role === "admin") {
      const foundUsers = await userModel.find({ role: "admin" });
    } else {
      console.log("Vous n'avez pas les permissions nécessaires.");
    }
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

// Contrôleur pour ajouter une période
export const addPeriode = async (req, res) => {
  // hethi cv tout les cas traité succéé
  try {
    const { dateDebut, dateFin } = req.body;

    // Validation des données
    if (!dateDebut || !dateFin) {
      return res
        .status(400)
        .json({ message: "Les dates début et fin sont requises." });
    }

    const currentDate = new Date();
    console.log(currentDate);
    if (new Date(dateDebut) < currentDate) {
      console.log("date est ", dateDebut);
      return res.status(400).json({
        message:
          "La date de début doit être supérieure ou égale à la date actuelle.",
      });
    }
    if (new Date(dateDebut) >= new Date(dateFin)) {
      return res
        .status(400)
        .json({ message: "La date de début doit être avant la date de fin." });
    }
    // Vérifier si une période existe déjà dans la plage spécifiée
    const periodeExistante = await Periode.findOne({
      $or: [
        {
          Date_Debut: { $lte: new Date(dateFin) },
          Date_Fin: { $gte: new Date(dateDebut) },
        },
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
      Date_Debut: new Date(dateDebut),
      Date_Fin: new Date(dateFin),
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
    if (!dateFin) {
      return res.status(400).json({ error: "Le champ 'dateFin' est requis." });
    }

    // Recherche de la période spécifique (exemple : "PFA")
    const periode = await Periode.findOne({ Nom: "PFA" });

    if (!periode) {
      return res.status(404).json({ error: "Période introuvable." });
    }

    // Vérification si la période a commencé
    const now = new Date();
    if (now >= periode.Date_Debut) {
      if (
        dateDebut &&
        new Date(dateDebut).getTime() !== periode.Date_Debut.getTime()
      ) {
        return res.status(400).json({
          error:
            "La période a commencé. La date de début ne peut pas être modifiée.",
        });
      }
    }

    // Vérifier que la dateDebut est avant la dateFin (si modifiable)
    if (dateDebut && new Date(dateDebut) >= new Date(dateFin)) {
      return res.status(400).json({
        error: "La date de début doit être antérieure à la date de fin.",
      });
    }

    // Mise à jour de la date de fin uniquement
    if (dateFin) {
      periode.Date_Fin = new Date(dateFin);
      await periode.save();

      res.status(200).json({
        message: "Les délais ont été mis à jour avec succès.",
        periode,
      });
    }
  } catch (error) {
    console.error("Erreur lors de la mise à jour des délais :", error.message);
    res.status(500).json({
      error: "Erreur serveur. Veuillez réessayer plus tard.",
    });
  }
};

// Contrôleur pour ajouter un sujet
export const addSujet = async (req, res) => {
  try {
    const { titre, description, technologies, eta_etudiant } = req.body;

    // Vérification des champs obligatoires
    if (!titre || !description || !technologies) {
      return res.status(400).json({
        error:
          "Les champs 'titre', 'description' et 'technologies' sont requis.",
      });
    }

    // Vérifier si le délai pour le dépôt est encore valide
    const periode = await Periode.findOne({ Nom: "PFA" });

    if (!periode) {
      return res.status(404).json({ error: "Période de dépôt introuvable." });
    }

    const now = new Date();
    if (now < periode.Date_Debut || now > periode.Date_Fin) {
      return res
        .status(400)
        .json({ error: "Le délai pour soumettre un sujet est dépassé." });
    }

    // Création d'un nouveau sujet
    const nouveauSujet = new Sujet({
      titre,
      description,
      technologies,
      eta_etudiant,
    });

    // Enregistrer le sujet dans la base de données
    await nouveauSujet.save();

    res.status(201).json({
      message: "Sujet ajouté avec succès.",
      sujet: nouveauSujet,
    });
  } catch (error) {
    console.error("Erreur lors de l'ajout du sujet :", error.message);
    res
      .status(500)
      .json({ error: "Erreur serveur. Veuillez réessayer plus tard." });
  }
};
