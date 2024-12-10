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
      required: true,
    },
    description: { type: String, required: false },
    technologies: { type: String, required: false },
    estBinome: { type: Boolean, required: false },
    //etudiant_id: [{ type: mongoose.Schema.Types.ObjectId, ref: "etudiant" }], // Étudiants affectés

    // Gestion des choix des sujets
    choices: [
      {
        etudiantId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "etudiant",
          required: true,
        }, // Étudiant principal
        binomeId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "etudiant",
          required: false,
        }, // Binôme si applicable
        priority: {
          type: Number,
          validate: {
            validator: (value) => [1, 2, 3].includes(value),
            message: "Priority must be 1, 2, or 3.",
          },
        },
      },
    ],

    etatDepot: {
      type: String,
      enum: ["rejected", "not rejected"],
      required: true,
      default: "not rejected",
    },
    etatAffectation: {
      type: String,
      enum: ["affected", "not affected"],
      required: false,
    },
    status: { type: String, enum: ["valid", "not valid"], required: false },
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
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Pfa", pfaSchema);
