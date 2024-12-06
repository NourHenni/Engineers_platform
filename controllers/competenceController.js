import Competence from "../models/competenceModel.js";
import Matiere from "../models/matiereModel.js";

// Créer une nouvelle compétence

export const createCompetence = async (req, res) => {
  try {
    const competences = new Competence(req.body);
    await competences.save();
    res.status(201).json(competences);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Afficher tous les competences
export const getCompetences = async (req, res) => {
  try {
    const competences = await Competence.find();
    res.json(competences);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Lire une competence par ID
export const getCompetenceById = async (req, res) => {
  try {
    const competences = await Competence.findById(req.params.id).populate(
      "matieres"
    );
    if (!competences)
      return res.status(404).json({ error: "Competence non trouvee" });
    res.json(competences);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
