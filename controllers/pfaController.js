import Pfa from "../models/pfaModel.js";
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

export const ajouterSujetPfa = async (req, res) => {
  try {
    const { titreSujet, description, technologies, estBinome } = req.body;

    // Vérification des données
    if (!titreSujet || !description || !technologies) {
      return res.status(400).json({ message: "Champs requis manquants." });
    }

    // Vérification du rôle de l'utilisateur connecté
    if (req.auth.role !== "enseignant") {
      return res.status(403).json({
        message: "Accès interdit : seul un enseignant peut déposer un sujet.",
      });
    }
    // Générer un code PFA au format PFA2024-01
    const generateCodePfa = async () => {
      const currentYear = new Date().getFullYear(); // Année actuelle
      const lastPfa = await Pfa.findOne().sort({ _id: -1 }); // Dernier sujet enregistré

      if (lastPfa && lastPfa.code_pfa) {
        const parts = lastPfa.code_pfa.split("-");
        const lastIdNumber = parts.length > 1 ? parseInt(parts[1], 10) : 0; // Extraire le numéro (ou 0 si non valide)
        const nextIdNumber = isNaN(lastIdNumber) ? 1 : lastIdNumber + 1; // Gérer NaN et incrémenter correctement
        return `PFA${currentYear}-${String(nextIdNumber).padStart(2, "0")}`; // Générer un code formaté
      } else {
        return `PFA${currentYear}-01`; // Premier code si aucun sujet n'existe
      }
    };

    const codePfa = await generateCodePfa(); // Appel pour générer le code PFA
    // Création d'un sujet PFA
    const nouveauPfa = new Pfa({
      code_pfa: codePfa, // Ajouter le code PFA généré
      titreSujet,
      description,
      technologies,
      estBinome,
      enseignant: req.auth.userId, // Associer l'enseignant connecté
    });

    // Sauvegarde du sujet PFA
    await nouveauPfa.save();

    // Utilisation de populate pour inclure les informations de l'enseignant
    const sujetAvecEnseignant = await Pfa.findById(nouveauPfa._id).populate(
      "enseignant"
    );

    res.status(201).json({
      message: "Sujet PFA ajouté avec succès.",
      sujet: sujetAvecEnseignant,
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
    const sujets = await Pfa.find({ enseignant: req.auth.userId })
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
    const sujet = await Pfa.findById(id)
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
    const sujet = await Pfa.findById(id);

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
    const sujet = await Pfa.findById(id);

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
    await Pfa.findByIdAndDelete(id);

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
