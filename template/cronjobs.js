import cron from "node-cron";
import User from "../models/userModel.js";
import nodemailer from "nodemailer";
import Periode from "../models/periodeModel.js";
import moment from "moment";
// ou tout autre service de notification

// Exemple de transporteur pour envoyer des e-mails (ici avec Nodemailer)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "nourhenniadmi@gmail.com",
    pass: "grjohbeztprdryfm",
  },
});

// Fonction pour envoyer une notification
const sendMonthlyNotification = async () => {
  try {
    // Récupérer les enseignants à partir de la base de données (remplacez par votre logique)
    const enseignants = await User.find({ role: "enseignant" });

    // Boucle pour envoyer un e-mail à chaque enseignant
    for (const enseignant of enseignants) {
      const mailOptions = {
        from: "nourhenniadmi@gmail.com",
        to: "siwar.dakhlaoui@istic.ucar.tn",
        subject: "Mise à jour de l'avancement des cours",
        text: "Cher(e) enseignant(e),\n Ce message est un rappel pour vous inviter à mettre à jour l'état d'avancement des cours que vous dispensez.\n\nNous vous remercions de votre collaboration précieuse.\n\nCordialement,\nL’équipe administrative",
      };

      await transporter.sendMail(mailOptions);
    }

    console.log("Notifications envoyées avec succès.");
  } catch (error) {
    console.error("Erreur lors de l'envoi des notifications:", error);
  }
};

// Planification du cron job pour exécuter la tâche chaque mois (par exemple le 1er jour de chaque mois à 9h00)
cron.schedule("* * * * *", () => {
  console.log("Envoi de la notification mensuelle...");
  sendMonthlyNotification();
});

/*//yasss
// Tâche planifiée
cron.schedule("0 9 * * *", async () => {
  console.log("Tâche Cron: Vérification des retards...");

  try {
    // Récupérer la date actuelle
    const currentDate = moment().utc().startOf("day");

    // Récupérer les périodes qui sont en retard
    const latePeriods = await Periode.find({
      Date_Fin_depot: { $lt: currentDate.toDate() },
      PeriodState: { $ne: "Finished" }, // État non terminé
    });

    if (latePeriods.length === 0) {
      console.log("Aucune période en retard trouvée.");
      return;
    }

    // Parcourir les périodes en retard et envoyer des emails aux utilisateurs
    for (const period of latePeriods) {
      // Mettre à jour l'état de la période
      period.PeriodState = "Late";
      await period.save();

      // Récupérer les utilisateurs associés (exemple, tous les étudiants)
      const users = await User.find({ role: "etudiant" }); // Adaptez à votre modèle et logique

      // Envoyer un email à chaque utilisateur
      for (const user of users) {
        const mailOptions = {
          from: "votre.email@gmail.com",
          to: user.email,
          subject: `Alerte de retard pour la période ${period.type}`,
          text: `Bonjour ${user.nom},\n\nLa période de dépôt "${period.type}" prévue entre ${moment(
            period.Date_Debut_depot
          ).format("DD/MM/YYYY")} et ${moment(period.Date_Fin_depot).format(
            "DD/MM/YYYY"
          )} est désormais en retard.\n\nVeuillez contacter l'administration pour régulariser votre situation.\n\nCordialement,\nL'équipe.`,
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email envoyé à ${user.email} pour la période ${period.type}`);
      }
    }
  } catch (error) {
    console.error("Erreur lors de la tâche Cron:", error.message);
  }
});*/
