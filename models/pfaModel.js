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
    period_pfa: { type: mongoose.Schema.Types.ObjectId, ref: "Periode" },
    status: { type: String, enum: ["valid", "not valid"], required: false },
    raison: {
      type: String,
      validate: {
        validator: function (value) {
          if (this.status === "not valid") {
            return value && value.trim().length > 0;
          }
          return true; // Si status n'est pas "non validé", raison peut être vide
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
