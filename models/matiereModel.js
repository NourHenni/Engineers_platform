import mongoose from "mongoose";
import User from "../models/userModel.js";

// Section Schema
const sectionSchema = new mongoose.Schema({
  nomSection: { type: String, required: true },
  Description: { type: String, required: true },
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
  archived: { type: Boolean, 
    default: false },
  competences: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "competences",
      required: true,
    },
  ],
  enseignant: 
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Référence au modèle User
      default:null
    },
  
  
});

export default mongoose.model("matieres", matiereSchema);
