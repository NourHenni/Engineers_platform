import cron from 'node-cron';
import User from "../models/userModel.js";
import nodemailer from 'nodemailer';
// ou tout autre service de notification

// Exemple de transporteur pour envoyer des e-mails (ici avec Nodemailer)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
   
    user:'nourhenniadmi@gmail.com',
    pass:'grjohbeztprdryfm',
  },
});

// Fonction pour envoyer une notification
const sendMonthlyNotification = async () => {
  try {
    // Récupérer les enseignants à partir de la base de données (remplacez par votre logique)
    const enseignants = await User.find({ role: 'enseignant' });

    // Boucle pour envoyer un e-mail à chaque enseignant
    for (const enseignant of enseignants) {
      const mailOptions = {
        from: 'nourhenniadmi@gmail.com',
        to: enseignant.adresseEmail,
        subject: 'Mise à jour de l\'avancement des cours',
        text: 'Cher(e) enseignant(e),\n Ce message est un rappel pour vous inviter à mettre à jour l\'état d\'avancement des cours que vous dispensez.\n\nNous vous remercions de votre collaboration précieuse.\n\nCordialement,\nL’équipe administrative',


      };

      await transporter.sendMail(mailOptions);
    }

    console.log('Notifications envoyées avec succès.');
  } catch (error) {
    console.error('Erreur lors de l\'envoi des notifications:', error);
  }
};

// Planification du cron job pour exécuter la tâche chaque mois (par exemple le 1er jour de chaque mois à 9h00)
cron.schedule('* * * * *', () => {
  console.log('Envoi de la notification mensuelle...');
  sendMonthlyNotification();
});

