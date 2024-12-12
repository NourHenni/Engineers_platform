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
<<<<<<< HEAD
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
=======

    
    technologies: { type: [String], required: false },

    description: { type: String, required: false },
   

    estBinome: { type: Boolean, required: false },
>>>>>>> 89a7955826d4bce3f26df034684885f7f9fc9312
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
<<<<<<< HEAD
    status: {
      type: String,
      enum: ["valided", "not valided"],
      required: false,
    },
=======

    period_pfa: { type: mongoose.Schema.Types.ObjectId, ref: "Periode" },
    status: { type: String, enum: ["valid", "not valid"], required: false },

>>>>>>> 89a7955826d4bce3f26df034684885f7f9fc9312
    raison: {
      type: String,
      validate: {
        validator: function (value) {


          if (this.status === "not valid") {
            return value && value.trim().length > 0;

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
