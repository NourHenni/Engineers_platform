import mongoose from "mongoose";

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
      enum: ['homme', 'femme'],
      required: true
    },
    dateDeNaissance: {
      type: Date, // Using Date type for storing dates
      required: true, // Assuming it is mandatory
    },
    gouvernorat: {
      type: String,
      required: true
    },
    addresse: {
      type: String,
      required: true
    },
    ville: {
      type: String,
      required: true
    },
    code_postal: {
      type: Number,
      required: true
    },
    nationalite: {
      type: String,
      required: true
    },
    telephone: {
      type: Number,
      required: true
    },
    annee_entree_isamm: {
      type: Number,
      required: true
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
    archivee: {
      type: Boolean, // Boolean type to indicate true or false
      default: false, // Default value is set to false
    },
<<<<<<< HEAD
    isFirstSend: { type: Boolean, default: false },
=======
    semestre: {
      type: String,
      enum: ["S1", "S2", "S3", "S4", "S5"],
      required: true,
    },
>>>>>>> cbbc03827cef5927e3a2fdcc90d48f13040e5d78
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("User", userSchema);
