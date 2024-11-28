import Periode from "../models/periodeModel.js";

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
