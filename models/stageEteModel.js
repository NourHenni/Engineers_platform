import mongoose from "mongoose";

const stageEteSchema = new mongoose.Schema(
  {
    titreSujet: {
      type: String,
      required: true,
    },
    nomEntreprise: {
      type: String,
      required: true,
    },
    dateDebut: {
      type: Date,
      required: true,
    },
    dateFin: {
      type: Date,
      required: true,
    },
    niveau: {
      type: String,
      enum: ["premiereannee", "deuxiemeannee","troisiemeannee"],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    /*raison: {
      type: String,
      required: true,
    },*/
    natureSujet: {
      type: String,
      required: true,
    },
    statutSujet: {
      type: String,
      enum: ["Valide", "Non valide"],
      default: "Non valide",
     
    },
    statutDepot: {
      type: String,
      enum: ["Depose", "Non depose"],
      default: "Non depose",
      
    },
    soutenance: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SoutenanceStageEte",
      },
      etudiant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Référence au modèle User
        
      },
      enseignant: {

      
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Référence au modèle User
      },
      
     
      
        rapport: { type: String, required: true },
        attestation: { type: String, required: true },
        ficheEvaluation: { type: String, required: true },
      
      
      
      
  },
  {
    timestamps: true, 
  }
);

export default mongoose.model("StageEte", stageEteSchema);
