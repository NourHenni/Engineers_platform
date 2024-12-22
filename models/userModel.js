import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    nom: {
      type: String,
      required: false,
    },
    prenom: {
      type: String,
      required: false,
    },
    cin: {
      type: Number,
      required: false,
      unique: false,
    },
    genre: {
      type: String,
      enum: ["M", "F"],
      required: false,
    },
    dateDeNaissance: {
      type: Date, // Using Date type for storing dates
      required: false, // Assuming it is mandatory
    },
    gouvernorat: {
      type: String,
      required: false,
    },
    addresse: {
      type: String,
      required: false,
    },
    ville: {
      type: String,
      required: false,
    },
    code_postal: {
      type: Number,
      required: false,
    },
    nationalite: {
      type: String,
      required: false,
    },
    telephone: {
      type: Number,
      required: false,
    },
    annee_entree_isamm: {
      type: Number,
      required: false,
    },
    adresseEmail: {
      type: String,
      required: false,
      unique: false,
    },
    password: {
      type: String,
      required: false,
    },
    role: {
      type: String,
      enum: ["etudiant", "enseignant", "admin"],
      required: false,
    },

    isFirstSendPfa: { type: Boolean, default: false },
    isFirstSendEte: { type: Boolean, default: false },
    niveau: { type: String, enum: ["1ING", "2ING", "3ING"] },

    isGraduated: {
      type: String,
      enum: ["graduated", "not_graduated"],
    },

    archivee: {
      type: Boolean, // Boolean type to indicate true or false
      default: false, // Default value is set to false
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
      enum: ["nouveau", "redoublant", "diplome"],
    },
    grade: {
      type: String,
      required: false,
    },
  },

  {
    timestamps: true,
  }
);

export default mongoose.model("User", userSchema);
