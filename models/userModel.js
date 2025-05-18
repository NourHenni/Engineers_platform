import mongoose, { Schema } from "mongoose";

const userSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: true,
    },
    prenom: {
      type: String,
      required: true,
    },
    cin: {
      type: Number,
      required: true,
      unique: true,
    },
    genre: {
      type: String,
      enum: ["M", "F"],
      required: true,
    },
    dateDeNaissance: {
      type: Date,
      required: true,
    },
    gouvernorat: {
      type: String,
      required: true,
    },
    addresse: {
      type: String,
      required: true,
    },
    ville: {
      type: String,
      required: true,
    },
    code_postal: {
      type: Number,
      required: true,
    },
    nationalite: {
      type: String,
      required: true,
    },
    telephone: {
      type: Number,
      required: true,
    },
    annee_entree_isamm: {
      type: Number,
      required: true,
    },
    annee_sortie_isamm: {
      type: Number,
      required: false,
    },
    adresseEmail: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["etudiant", "enseignant", "admin"],
      required: true,
    },
    isFirstSendPfa: { type: Boolean, default: false },
    isFirstSendEte: { type: Boolean, default: false },
    isFirstSendListePfa: { type: Boolean, default: false },
    isFirstSendPlanningPfa: {
      type: Boolean,
      default: false,
    },

    niveau: { type: Number, enum: [1, 2, 3] },
    isGraduated: {
      type: String,
      enum: ["graduated", "not_graduated"],
    },
    archivee: {
      type: Boolean,
      default: false,
    },
    matieres: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "matieres",
        required: false,
      },
    ],
    semestre: {
      type: String,
      enum: ["S1", "S2", "S3", "S4", "S5"],
    },

    situation: {
      type: String,
      enum: ["passe", "redouble", "diplome"],
    },
    cvinfos: {
      diplomes: { type: [String], default: [] }, // Diplômes (anciens ou nouveaux)
      certifications: { type: [String], default: [] }, // Certifications
      langues: { type: [String], default: [] }, // Langues
      experiences: { type: [String], default: [] }, // Expériences professionnelles
    },
    grade: {
      type: String,
      required: false,
    },
    baccalaureat: { type: String, required: false },
    annee_bac: { type: Number, required: false },
    moyenne_bac: { type: Number, required: false },
    mention: { type: String, required: false },
    universite: { type: String, required: false },
    etablissement: { type: String, required: false },
    type_licence: { type: String, required: false },
    specialite: { type: String, required: false },
    annee_licence: { type: Number, required: false },
    est_prepa: { type: Boolean, required: false },
    stageete: { type: Schema.Types.ObjectId, ref: "StageEte", default: null },
    pfas: [{ type: mongoose.Schema.Types.ObjectId, ref: "Pfa", default: [] }],
    pfa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pfa", // Référence au modèle Pfa
      required: true, // La soutenance doit être liée à un PFA
    },

    academic_statuses: [
      {
        academic_year: {
          type: String, // Format attendu: "2023-2024"
          required: true,
        },
        status: {
          type: String,
          enum: ["passe", "redouble", "diplome"],
          required: true,
        },
        details: {
          type: String, // Pour des informations supplémentaires
          default: "",
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("User", userSchema);
