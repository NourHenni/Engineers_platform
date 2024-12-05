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
        .json({ message: "Les dates debut et fin sont requises." });
    }

    const currentDate = new Date();
    console.log(currentDate);
    if (new Date(dateDebut) < currentDate) {
      console.log("date est ", dateDebut);
      return res.status(400).json({
        message:
          "La date de debut doit être superieure ou egale à la date actuelle.",
      });
    }
    if (new Date(dateDebut) >= new Date(dateFin)) {
      return res
        .status(400)
        .json({ message: "La date de debut doit être avant la date de fin." });
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
        .json({ message: "Une periode existe dejà pour ces dates." });
    }

    // Créer une nouvelle période
    const nouvellePeriode = new Periode({
      Nom: "PFA",
      Date_Debut: new Date(dateDebut),
      Date_Fin: new Date(dateFin),
    });

    await nouvellePeriode.save();
    res.status(201).json({
      message: "Periode ajoutee avec succes.",
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
    const periode = await Periode.findOne({ Nom: "PFA" });

    if (!periode) {
      return res.status(404).json({ error: "Periode introuvable." });
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

// Contrôleur pour ajouter un nouveau sujet PFA
export const ajouterSujetPfa = async (req, res) => {
  try {
    // Extraire les détails depuis le corps de la requête
    const {
      titreSujet,
      description,
      technologies,
      estBinome,
      etudiant1, // Étudiant 1 (obligatoire pour monôme, facultatif pour binôme)
      etudiant2, // Étudiant 2 (obligatoire si estBinome est true)
      enseignantId, // Identifiant de l'enseignant qui dépose le sujet
    } = req.body;

    // Valider les données d'entrée
    if (!titreSujet || !description || !technologies) {
      return res.status(400).json({
        message:
          "Les champs titreSujet, description et technologies sont requis.",
      });
    }

    // Vérifier si une période valide est ouverte
    const dateActuelle = new Date();
    const periodeOuverte = await Periode.findOne({
      Nom: "PFA",
      Date_Debut: { $lte: dateActuelle },
      Date_Fin: { $gte: dateActuelle },
    });

    if (!periodeOuverte) {
      return res.status(400).json({
        message:
          "Aucune période ouverte actuellement pour ajouter un sujet PFA.",
      });
    }

    // Vérifier la validité de estBinome
    if (estBinome && (!etudiant1 || !etudiant2)) {
      return res.status(400).json({
        message:
          "Pour un binôme, les noms des deux étudiants (etudiant1, etudiant2) sont requis.",
      });
    }

    // Vérifier la validité pour un monôme
    if (!estBinome && !etudiant1) {
      return res.status(400).json({
        message: "Pour un monôme, le nom de l'étudiant (etudiant1) est requis.",
      });
    }

    // Vérifier la présence de l'identifiant de l'enseignant
    if (!enseignantId) {
      return res.status(400).json({
        message: "L'identifiant de l'enseignant (enseignantId) est requis.",
      });
    }

    // Préparer l'enregistrement du sujet PFA
    const nouveauPfa = new Pfa({
      titreSujet,
      description,
      technologies,
      estBinome,
      natureSujet: estBinome ? "Binôme" : "Monôme",
      code_pfa: `PFA-${Date.now()}`, // Générer un code unique
      etatDepot: "non rejeté",
      etatAffectation: "non affecté",
      status: "non validé",
      enseignant: enseignantId, // Associer l'enseignant au sujet
    });

    // Ajouter les noms des étudiants si fournis
    if (etudiant1) nouveauPfa.etudiant1 = etudiant1;
    if (etudiant2) nouveauPfa.etudiant2 = etudiant2;

    // Enregistrer le nouveau sujet PFA
    await nouveauPfa.save();

    res.status(201).json({
      message: "Sujet PFA ajouté avec succès.",
      pfa: nouveauPfa,
    });
  } catch (error) {
    console.error("Erreur lors de l'ajout d'un sujet PFA :", error.message);
    res.status(500).json({
      message: "Erreur serveur. Veuillez réessayer plus tard.",
    });
  }
};
