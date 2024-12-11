import StageEte from "../models/stageEteModel.js";
import User from "../models/userModel.js";



// Contrôleur pour déposer un sujet avec documents
export const postInternship = async (req, res) => {
  try {
    const { type } = req.params;
    const { titreSujet, nomEntreprise, dateDebut, dateFin, niveau, description,  natureSujet } = req.body;

    if (
      !titreSujet ||
      !nomEntreprise ||
      !dateDebut ||
      !dateFin ||
      !niveau ||
      !description ||
      //!raison ||
      !natureSujet
    ) {
      console.log(titreSujet ,nomEntreprise, dateDebut,dateFin,niveau, description , natureSujet );
      return res.status(400).json({
        success: false,
        message: "Tous les champs obligatoires doivent être remplis.",
      });
    }

    // Vérification des fichiers
    /*if (!req.files || req.files.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Tous les documents (rapport, attestation, fiche d'évaluation) doivent être fournis.",
      });*/
    
    const rapport = req.files.rapport ? req.files.rapport[0].path : null;
    const attestation = req.files.attestation ? req.files.attestation[0].path : null;
    const ficheEvaluation = req.files.ficheEvaluation ? req.files.ficheEvaluation[0].path : null;
    
    if (!rapport || !attestation || !ficheEvaluation) {
      return res.status(400).json({
        success: false,
        message: "Tous les documents (rapport, attestation, fiche d'évaluation) doivent être fournis.",
      });
    }
    
     //Récupération des chemins des fichiers
    //const [rapport, attestation, ficheEvaluation] = req.files.map((file) => file.path);

    // Création du stage
    const newStage = new StageEte({
      titreSujet,
      nomEntreprise,
      dateDebut,
      dateFin,
      niveau: "premiereannee",
      description,
      
      natureSujet,
      statutSujet: "Non valide",
      statutDepot: "Depose",
      etudiant: req.auth.userId,
        rapport, 
        attestation, 
      ficheEvaluation , // Stockage des chemins des fichiers
    });

    const savedStage = await newStage.save();
    console.log(savedStage)

    res.status(201).json({
      success: true,
      message: "Sujet de stage déposé avec succès.",
      stage: savedStage,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors du dépôt du sujet.",
      error: error.message,
    });
  }

}
export const getInternshipsByType = async (req, res) => {
  const { type } = req.params;

  try {
    // Récupérer tous les stages pour un niveau donné
    const stages = await StageEte.find({ niveau: type }).populate("etudiant", "nom prenom adresseEmail role");

    if (!stages || stages.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Aucun stage trouvé pour le niveau : ${type}`,
      });
    }

    // Structurer les résultats
    const result = stages.map((stage) => ({
      etudiant: {
        nom: stage.etudiant.nom,
        prenom: stage.etudiant.prenom,
        email: stage.etudiant.adresseEmail,
      },
      stage: {
        titreSujet: stage.titreSujet,
        nomEntreprise: stage.nomEntreprise,
        dateDebut: stage.dateDebut,
        dateFin: stage.dateFin,
        description: stage.description,
        natureSujet: stage.natureSujet,
        statutSujet: stage.statutSujet,
        statutDepot: stage.statutDepot,
        fichiers: {
          rapport: stage.rapport,
          attestation: stage.attestation,
          ficheEvaluation: stage.ficheEvaluation,
        },
      },
    }));

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Erreur :", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des stages.",
      error: error.message,
    });
  }
};
export const getStageDetails = async (req, res) => {
  try {
    const { type, id } = req.params; // Récupération des paramètres

    // Rechercher le stage par ID et niveau
    const stage = await StageEte.findOne({ _id: id, niveau: type }).populate(
      "etudiant",
      "nom prenom adresseEmail cin role"
    );

    // Vérifier si le stage existe
    if (!stage) {
      return res.status(404).json({
        success: false,
        message: "Stage introuvable pour cet ID et ce niveau.",
      });
    }

    // Réponse avec les détails du stage
    res.status(200).json({
      success: true,
      message: "Détails du stage récupérés avec succès.",
      data: stage,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de la récupération du stage.",
      error: error.message,
    });
  }
};



/*export const assignTeachersToStages = async (req, res) => {
  try {
    const { type } = req.params;
    const { teacherIds } = req.body; // Liste des IDs des enseignants

    if (!teacherIds || teacherIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Liste des enseignants non fournie.",
      });
    }

    // Récupérer les enseignants avec leurs matières
    const teachers = await User.find({ _id: { $in: teacherIds }, role: "enseignant", numMatieres: { $gt: 0 } }).lean();

    if (teachers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Aucun enseignant valide trouvé.",
      });
    }

    // Récupérer les stages correspondant au niveau (type)
    const stages = await StageEte.find({ niveau: type, statutSujet: "Non validé" });

    if (stages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Aucun stage à assigner pour ce niveau.",
      });
    }

    // Calcul de la distribution proportionnelle
    const totalMatieres = teachers.reduce((sum, teacher) => sum + teacher.numMatieres, 0);
    const coefficient = Math.floor(stages.length / totalMatieres);

    // Assignation des stages
    let assignedStages = [];
    let stageIndex = 0;

    teachers.forEach((teacher) => {
      const numStages = teacher.numMatieres * coefficient;
      for (let i = 0; i < numStages && stageIndex < stages.length; i++) {
        stages[stageIndex].enseignant = teacher._id; // Assigner l'enseignant au stage
        assignedStages.push(stages[stageIndex]);
        stageIndex++;
      }
    });

    // Sauvegarder les stages assignés
    await Promise.all(assignedStages.map((stage) => stage.save()));

    res.status(200).json({
      success: true,
      message: "Stages assignés avec succès aux enseignants.",
      assignedStages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Une erreur est survenue lors de l'assignation des stages.",
      error: error.message,
    });
  }

};*/

