import mongoose from "mongoose";

const competenceSchema = new mongoose.Schema({
  nomCompetence: {
    type: String,
    enum: [
      "outilsEtTechniquesScientifiques",
      "compTechnologiques",
      "autoDevlopEtInnovation",
      "Communication",
    ],
    required: true,
  },

  codeCompetence: {
    type: String,
    required: true,
    validate: {
      validator: function (value) {
        // Validation dynamique en fonction de nomCompetence
        if (this.nomCompetence === "outilsEtTechniquesScientifiques") {
          return ["CS1", "CS2"].includes(value); // Autorise seulement CS1 ou CS2
        }
        if (this.nomCompetence === "compTechnologiques") {
          return ["CS3", "CS4", "CS5", "CS6", "CS7", "CS8"].includes(value);
        }
        if (this.nomCompetence === "autoDevlopEtInnovation") {
          return ["CS9"].includes(value);
        } else if (this.nomCompetence === "Communication") {
          return ["CS10", "CS11"].includes(value);
        }
        return false; // Aucun codeCompetence valide pour d'autres valeurs de nomCompetence
      },
      message: (props) =>
        `${props.value} n'est pas un codeCompetence valide pour ${props.instance.nomCompetence}.`,
    },
  },

  descriptionCompetence: {
    type: String,
    required: true,
  },
  matieres: [{ type: mongoose.Schema.Types.ObjectId, ref: "matieres" }],
  archived: { type: Boolean, default: false }, // Champ pour archiver
});

export default mongoose.model("competences ", competenceSchema);
