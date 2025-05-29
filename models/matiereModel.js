import mongoose from "mongoose";
import User from "../models/userModel.js";
const propositionSchema = new mongoose.Schema({
  contenu: {
    type: Object, // Contient les nouvelles informations proposées
    required: true,
  },
  raison: {
    type: String, // Raison du changement
    required: true,
  },

  enseignant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Référence au modèle User
    required: false,
  },

  valide: {
    type: Boolean, // Statut de validation
    default: false,
  },
  dateProposition: {
    type: Date,
    default: Date.now,
  },
});

// Section Schema
const sectionSchema = new mongoose.Schema({
  nomSection: { type: String, required: true },
  Description: { type: String },
  AvancementSection: {
    type: String,
    enum: ["NonCommencee", "EnCours", "Terminee"],
    default: "NonCommencee",
  },
  dateFinSection: { type: Date },
});

// Chapitre Schema
const chapitreSchema = new mongoose.Schema({
  titreChapitre: { type: String, required: true },
  sections: [sectionSchema],
  AvancementChap: {
    type: String,
    enum: ["NonCommencee", "EnCours", "Terminee"],
    default: "NonCommencee",
  },
  dateFinChap: { type: Date },
});

const matiereSchema = mongoose.Schema({
  GroupeModule: {
    type: String,
    required: true,
  },

  CoeffGroupeModule: {
    type: Number,
    required: true,
  },

  CodeMatiere: {
    type: String,
    required: true,
  },
  Nom: {
    type: String,
    required: true,
  },
  Credit: {
    type: Number,
    required: true,
  },
  Coefficient: {
    type: Number,
    required: true,
  },

  VolumeHoraire: {
    type: Number,
    required: true,
  },
  NbHeuresCours: {
    type: Number,
    required: true,
  },
  NbHeuresTD: {
    type: Number,
    required: true,
  },
  NbHeuresTP: {
    type: Number,
    required: true,
  },

  Curriculum: [chapitreSchema],

  Annee: {
    type: Number,
    required: true,
  },
  semestre: {
    type: String,
    required: true,
  },
  niveau: {
    type: String,
    enum: ["1", "2", "3"],
    required: true,
  },

  publiee: {
    type: Boolean,
    default: false,
    required: true,
  },
  archived: { type: Boolean, default: false },
  competences: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "competences",
      required: true,
    },
  ],
  enseignant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Référence au modèle User
    default: null,
  },
});

const evaluationSchema = new mongoose.Schema({
  VolumeHoraire: {
    type: Number, // Note donnée par l'étudiant
    required: true,
    min: 0, // Note minimale
    max: 4, // Note maximale},
  },
  MethodesPedagogiques: {
    type: Number, // Note donnée par l'étudiant
    required: true,
    min: 0, // Note minimale
    max: 4, // Note maximale},
  },
  Objectifs: {
    type: Number, // Note donnée par l'étudiant
    required: true,
    min: 0, // Note minimale
    max: 4, // Note maximale},
  },
  CoheranceContenu: {
    type: Number, // Note donnée par l'étudiant
    required: true,
    min: 0, // Note minimale
    max: 4, // Note maximale},
  },
  Satisfaction: {
    type: Number, // Note donnée par l'étudiant
    required: true,
    min: 0, // Note minimale
    max: 4, // Note maximale},
  },
  PertinenceMatiere: {
    type: Number, // Note donnée par l'étudiant
    requied: true,
    min: 0, // Note minimale
    max: 4, // Note maximale},
  },
  Remarques: { type: String },
  dateEvaluation: {
    type: Date,
    default: Date.now, // Date de l'évaluation
  },
});

matiereSchema.add({
  historiquePropositions: [propositionSchema],
});

matiereSchema.add({
  historiqueModifications: [
    {
      contenu: { type: Object },

      dateModification: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

matiereSchema.add({
  evaluations: [evaluationSchema], // Liste des évaluations
  etudiantsDejaEvalue: [String], // Liste des IDs des étudiants ayant deja évalué
});

export default mongoose.model("matieres", matiereSchema);
