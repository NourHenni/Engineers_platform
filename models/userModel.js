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
   

    situation: {
      type: String,
      enum: ['Nouveau', 'Redoublant', 'Diplomé'],
    },
    baccalaureat: {
      type: String,
      enum: ['bac math', 'bac technique', 'bac sciences', 'bac economie', 'bac informatique'],
    },
    annee_bac: {
      type: Number,

    },
    moyenne_bac: {
      type: Number,

    },
    mention: {
      type: String,

    },
    est_prepa: {
      type: Boolean,

    },
    universite: {
      type: String,

    },
    etablissement: {
      type: String,

    },
    type_licence: {
      type: String,

    },
    specialite: {
      type: String,

    },
    annee_licence: {
      type: Number,
 
    },
    annee_sortie_isamm: {
      type: Number,
      
    },

    
    grade:{
      type:String
    }

  },
  {
    timestamps: true,
  }
);

export default mongoose.model("User", userSchema);
