import mongoose from "mongoose";

// Définir le schéma pour la classe Période
const periodeSchema = new mongoose.Schema(
  {
    Nom: { type: String, required: true }, // Nom de la période
    Date_Debut_depot: {
      type: Date,
      validate: {
        validator: function (value) {
          return value != null; // Vérifie que la date n'est pas nulle si fournie
        },
        message: "La date de début de dépôt ne doit pas être vide",
      },
    },
    Date_Fin_depot: {
      type: Date,
      validate: {
        validator: function (value) {
          // Vérifie que la date de fin est après la date de début si elle est fournie
          return !value || value > this.Date_Debut_depot;
        },
        message: "La date de fin doit être après la date de début",
      },
    },
    type: {
      type: String,
      enum: ["Summer Internship", "PFA Project"],
      required: true,
    },
    niveau: {
      type: String,
      enum: ["premiereannee", "deuxiemeannee"],
    },
    PeriodState: {
      type: String,
      required: true,
      enum: ["In progress", "Closed", "Not started yet"],
    },
    Date_Debut_choix: {
      type: Date,
      required: [false, "La date de début est requise"],
    },
    Date_Fin_choix: {
      type: Date,
      required: [false, "La date de fin est requise"],
      validate: {
        validator: function (value) {
          // Vérifier que la date de fin est après la date de début
          return value > this.Date_Debut_choix;
        },
        message: "La date de fin doit être après la date de début",
      },
    },
  },
  {
    timestamps: true, // Active les champs createdAt et updatedAt
  }
);

// Exporter le modèle Période
export default mongoose.model("Periode", periodeSchema);
