import mongoose from "mongoose";

const soutenanceSchema = new mongoose.Schema(
  {
    date_soutenance: {
      type: Date,
      required: true,
    },
    heure_soutenance: {
      type: String, // Format HH:mm
      required: true,
    },
    finHeure: {
      type: String, // Calculée automatiquement en fonction de la durée (30 min)
      required: true,
    },
    salle: {
      type: String,
      required: true,
    },
    pfa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pfa", // Référence au modèle Pfa
      required: true, // La soutenance doit être liée à un PFA
    },
    enseignant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Référence au modèle `User`
      required: false,
    },
    rapporteur: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Référence au modèle `User` pour le rapporteur
      required: false,
    },
    etudiants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Référence au modèle `User` pour les étudiants
        required: false,
      },
    ],
    isPublished: {
      type: Boolean, // État de publication
      default: false, // Par défaut, une soutenance n'est pas publiée
      required: true,
    },
    emailSent: {
      // Indique si l'email a été envoyé
      type: Boolean,
      default: false,
    },
    emailSentAt: {
      // Date de l'envoi de l'email
      type: Date,
      required: false,
    },
    isSecondSend: {
      // Indique si c'est un deuxième envoi
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Ajoute automatiquement createdAt et updatedAt
  }
);

export default mongoose.model("Soutenance", soutenanceSchema);
