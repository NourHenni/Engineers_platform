import cron from "node-cron";
import User from "../models/userModel.js";
import nodemailer from "nodemailer";
import Periode from "../models/periodeModel.js";
import moment from "moment";

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
cron.schedule("0 9 1 * *", () => {
  console.log("Envoi de la notification mensuelle...");
  sendMonthlyNotification();
});


 	
// Envoie de mail automatique pour retard de depot de stage
// Tâche planifiée
cron.schedule("0 9 * * *", async () => {
  console.log("Tâche Cron: Vérification des retards...");

  try {
    // Récupérer la date actuelle
    const currentDate = moment().utc().startOf("day");

    // Récupérer les périodes en retard
    const latePeriods = await Periode.find({
      Date_Fin_depot: { $lt: currentDate.toDate() },
    
    });

    if (latePeriods.length === 0) {
      console.log("Aucune période en retard trouvée.");
      return;
    }

    for (const period of latePeriods) {
      // Mettre à jour l'état de la période
      period.PeriodState = "Late";
      await period.save();

      // Trouver les étudiants liés à cette période n'ayant pas déposé
      const stagesNonDeposes = await StageEte.find({
        statutDepot: "Non depose", // Seulement ceux qui n'ont pas déposé
        niveau: period.niveau, // Seulement ceux appartenant à la période concernée
      }).populate("etudiant"); // Inclure les informations de l'étudiant

      if (stagesNonDeposes.length === 0) {
        console.log(`Aucun étudiant en retard trouvé pour la période ${period.type}.`);
        continue;
      }

      for (const stage of stagesNonDeposes) {
        const user = stage.etudiant;

        // Vérifiez que l'étudiant a un email valide
        if (!user || !user.adresseEmail) {
          console.log(`Email manquant pour l'étudiant ${user ? user.nom : "inconnu"}.`);
          continue;
        }

        // Configurer le transporteur pour l'email
            const transporter = nodemailer.createTransport({
              host: process.env.HOST,
              port: process.env.PORT_SSL,
              secure: true,
              service: process.env.MAILER_SERVICE_PROVIDER,
              auth: {
                user: process.env.MAILER_EMAIL_ID,
                pass: process.env.MAILER_PASSWORD,
              },
              tls: {
                rejectUnauthorized: false, // Désactiver la validation stricte
              },
            });
        const mailOptions = {
          from: process.env.MAILER_EMAIL_ID,
          to: user.adresseEmail,
          subject: `Alerte de retard pour la période ${period.type}`,
          text: `Bonjour ${user.nom},\n\nVous n'avez pas déposé votre rapport pour la période "${period.type}" prévue entre ${moment(period.Date_Debut_depot).format(
            "DD/MM/YYYY"
          )} et ${moment(period.Date_Fin_depot).format(
            "DD/MM/YYYY"
          )}.\n\nVeuillez régulariser votre situation au plus vite.\n\nCordialement,\nL'équipe.`,
        };

        // Envoyer l'email
        await transporter.sendMail(mailOptions);
        console.log(`Email envoyé à ${user.adresseEmail} pour la période ${period.type}`);
      }
    }
  } catch (error) {
    console.error("Erreur lors de la tâche Cron:", error.message);
  }
});
