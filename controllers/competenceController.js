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

// Afficher une competence par ID
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

// Modifier une competence
import mongoose from "mongoose";

export const updateCompetence = async (req, res) => {
  const { id } = req.params; // Récupère l'ID depuis les paramètres de l'URL
  const { force, ...updatedData } = req.body; // Récupère les données à mettre à jour

  try {
    // Vérifiez que l'ID est valide
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ message: "ID invalide pour la compétence." });
    }

    // Récupérer la compétence
    const competence = await Competence.findById(id).populate("matieres");
    if (!competence) {
      return res.status(404).json({ message: "Compétence non trouvée." });
    }

    // Vérifiez si la compétence est assignée à des matières
    const isAssignedToMatieres = competence.matieres.length > 0;
    if (isAssignedToMatieres && !force) {
      return res.status(400).json({
        message:
          "La compétence est déjà assignée à des matières. Utilisez 'force: true' pour forcer la modification.",
        matieres: competence.matieres,
      });
    }

    // Utilisez findByIdAndUpdate avec l'ID dans un objet
    const updatedCompetence = await Competence.findByIdAndUpdate(
      id, // L'ID doit être dans le premier argument
      updatedData, // Les données à mettre à jour
      { new: true, runValidators: true } // Options
    );

    // Si la mise à jour a échoué
    if (!updatedCompetence) {
      return res
        .status(404)
        .json({ message: "Erreur lors de la mise à jour." });
    }

    res.status(200).json({
      message: isAssignedToMatieres
        ? "Compétence modifiée avec succès (modification forcée)."
        : "Compétence modifiée avec succès.",
      competence: updatedCompetence,
    });
  } catch (error) {
    console.error("Erreur lors de la modification de la compétence :", error);
    res.status(500).json({ error: error.message });
  }
};

// Archiver une competence
export const deleteCompetence = async (req, res) => {
  const { id } = req.params;
  const { archive = false } = req.body; // Si 'archive' est passé dans le corps de la requête, on archive au lieu de supprimer

  try {
    // Vérifier si l'ID est valide
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ message: "ID invalide pour la compétence." });
    }

    // Récupérer la compétence à supprimer
    const competence = await Competence.findById(id).populate("matieres");
    if (!competence) {
      return res.status(404).json({ message: "Compétence non trouvée." });
    }

    // Vérifier si la compétence est assignée à des matières
    const isAssignedToMatieres = competence.matieres.length > 0;
    if (isAssignedToMatieres && !archive) {
      return res.status(400).json({
        message:
          "La compétence est déjà assignée à des matières. Utilisez 'archive: true' pour archiver la compétence au lieu de la supprimer.",
        matieres: competence.matieres,
      });
    }

    // Si 'archive' est vrai, on met à jour la compétence pour l'archiver
    if (archive) {
      competence.archived = true;
      await competence.save();
      return res.status(200).json({
        message: "Compétence archivée avec succès.",
        competence,
      });
    }

    // Sinon, on supprime la compétence
    await Competence.findByIdAndDelete(id);

    res.status(200).json({
      message: "Compétence supprimée avec succès.",
    });
  } catch (error) {
    console.error(
      "Erreur lors de la suppression ou de l'archivage de la compétence :",
      error
    );
    res.status(500).json({ error: error.message });
  }
};
