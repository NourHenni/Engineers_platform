import cron from "node-cron";
import Matiere from "./models/matiereModel.js"; // Assurez-vous que le chemin est correct
import User from "./models/userModel.js"; // Ajustez selon la structure du projet

// Tâche cron exécutée chaque mois le 1er à 9h00
cron.schedule("0 9 1 * *", async () => {
  console.log("Exécution du job cron pour la mise à jour des enseignants...");

  try {
    // Récupérer tous les enseignants (selon votre schéma utilisateur)
    const enseignants = await User.find({ role: "enseignant" });

    // Envoi d'une notification pour chaque enseignant
    enseignants.forEach((enseignant) => {
      console.log(
        `Notification envoyée à : ${enseignant.email} - Veuillez mettre à jour vos matières ce mois-ci.`
      );
    });
  } catch (error) {
    console.error("Erreur lors de l'exécution du job cron :", error);
  }
});

export default cron;
