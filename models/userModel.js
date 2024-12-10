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
    dateDeNaissance: {
      type: Date, // Using Date type for storing dates
      required: true, // Assuming it is mandatory
    },
    archivee: {
      type: Boolean, // Boolean type to indicate true or false
      default: false, // Default value is set to false
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("User", userSchema);
