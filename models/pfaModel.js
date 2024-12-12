import mongoose from "mongoose";

const pfaSchema = new mongoose.Schema(
  {
    code_pfa: String,
    titreSujet: {
      type: String,
      required: true,
    },
    natureSujet: {
      type: String,
    },
    description: {
      type: String,
      required: true,
    },
    technologies: {
      type: [String],
      required: true,
    },
    estBinome: {
      type: Boolean,
      required: false,
    },
    etatDepot: {
      type: String,
      enum: ["rejected", "not rejected"],
      required: false,
      default: "not rejected",
    },
    etatAffectation: {
      type: String,
      enum: ["affected", "not affected"],
      required: false,
      default: "not affected",
    },
    status: {
      type: String,
      enum: ["valided", "not valided"],
      required: false,
    },
    raison: {
      type: String,
      validate: {
        validator: function (value) {
          if (this.status === "not valided") {
            return value && value.trim().length > 0; // Raison doit être non vide
          }
          return true;
        },
        message: "Le champ 'raison' est requis si le statut est 'non validé'.",
      },
    },
    enseignant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Référence au modèle `User`
      required: true,
    },
    etudiant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Référence au modèle `User` pour l'étudiant
      required: false, // Pas obligatoire, car tous les sujets peuvent ne pas avoir un étudiant assigné
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Pfa", pfaSchema);
