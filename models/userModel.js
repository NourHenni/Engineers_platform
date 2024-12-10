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
    isFirstSend: { type: Boolean, default: false },
    niveau: { type: String, enum: ["1ING", "2ING", "3ING"] },
  },

  {
    timestamps: true,
  }
);

export default mongoose.model("User", userSchema);
