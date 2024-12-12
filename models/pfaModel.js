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

    
    technologies: { type: [String], required: false },

    description: { type: String, required: false },
   

    estBinome: { type: Boolean, required: false },
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

    period_pfa: { type: mongoose.Schema.Types.ObjectId, ref: "Periode" },
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
    enseignant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Référence au modèle `User`
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Pfa", pfaSchema);
