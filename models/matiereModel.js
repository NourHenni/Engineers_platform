import mongoose from "mongoose";
import User from "../models/userModel.js";

// Section Schema
const sectionSchema = new mongoose.Schema({
  nomSection: { type: String, required: true },
  Description: { type: String, required: true },
});

// Chapitre Schema
const chapitreSchema = new mongoose.Schema({
  titreChapitre: { type: String, required: true },
  sections: [sectionSchema],
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
  Semestre: {
    type: String,
    required: true,
  },
  Niveau: {
    type: String,
    enum: ["1ING", "2ING", "3ING"],
    required: true,
  },

  publiee: {
    type: Boolean,
    default: false,
    required: true,
  },
  competences: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "competences",
      required: false,
    },

  
  ],
  enseignant:[ {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Référence au modèle User
    required: true,
  },
]
});

export default mongoose.model("matieres", matiereSchema);
