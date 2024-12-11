import mongoose from "mongoose";

const soutenanceStageEteSchema = new mongoose.Schema(
  {
    horaire: {
      type: String,
      required: true, // Exemple : "14:30" (format 24h recommandé)
    },
    jour: {
      type: Date,
      required: true, // Utilisation de Date pour une validation plus stricte
    },
    lien: {
      type: String,
      required: true, //  lien Zoom ou Meet
    },
  },
  {
    timestamps: true, // Ajoute createdAt et updatedAt automatiquement
  }
);

export default mongoose.model("SoutenanceStageEte", soutenanceStageEteSchema);
