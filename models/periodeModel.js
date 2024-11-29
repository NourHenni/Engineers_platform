import mongoose from "mongoose";

// Définir le schéma pour la classe Période
const periodeSchema = new mongoose.Schema(
  {
    Nom: { type: String, required: true }, // Nom de la période
    Date_Debut: {
      type: Date,
      required: [true, "La date de début est requise"],
    },
    Date_Fin: {
      type: Date,
      required: [true, "La date de fin est requise"],
      validate: {
        validator: function (value) {
          // Vérifier que la date de fin est après la date de début
          return value > this.Date_Debut;
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
