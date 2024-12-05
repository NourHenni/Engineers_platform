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
    description: { type: String, required: true },
    technologies: { type: [String], required: true },
    estBinome: { type: Boolean, required: false },
    etatDepot: {
      type: String,
      enum: ["rejecté", "non rejecté"],
      required: false,
      default: "non rejecté",
    },
    etatAffectation: {
      type: String,
      enum: ["affecté", "non affecté"],
      required: false,
    },
    status: { type: String, enum: ["validé", "non validé"], required: false },
    raison: {
      type: String,
      validate: {
        validator: function (value) {
          if (this.status === "non validé") {
            return value && value.trim().length > 0; // Raison doit être non vide
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
