import Matiere from "../models/matiereModel.js";

// Créer une nouvelle matière
export const createMatiere = async (req, res) => {
  try {
    const matiere = new Matiere(req.body);
    console.log("Objet Matiere créé :", matiere);
    await matiere.save();
    res.status(201).json(matiere);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Lire toutes les matières
export const getMatieres = async (req, res) => {
  try {
    const matieres = await Matiere.find();
    res.json(matieres);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// **NOUVELLE FONCTION : Récupérer les matières d'un enseignant spécifique**
export const getMatieresByEnseignant = async (req, res) => {
  const { enseignantId } = req.params; // Récupérer l'ID de l'enseignant depuis les paramètres de la requête

  try {
    // Filtrer les matières attribuées à cet enseignant
    const matieres = await Matiere.find({ enseignants: enseignantId }).populate(
      "enseignants",
      "nom prenom email"
    );

    // Vérification si aucune matière n'est trouvée
    if (matieres.length === 0) {
      return res
        .status(404)
        .json({ message: "Aucune matière attribuée à cet enseignant." });
    }

    // Retourner les matières trouvées
    res.status(200).json(matieres);
  } catch (error) {
    console.error("Erreur lors de la récupération des matières :", error);
    res.status(500).json({ error: error.message });
  }
};

export default { createMatiere, getMatieres, getMatieresByEnseignant };
