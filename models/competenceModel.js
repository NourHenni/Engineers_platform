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
        return new Promise(async (resolve, reject) => {
          try {
            // Récupérer le nomCompetence selon le contexte
            let nom =
              typeof this.getUpdate === "function"
                ? this.getUpdate()?.nomCompetence
                : this.nomCompetence;

            // Si non trouvé, chercher dans la base
            if (!nom && this._id) {
              const doc = await mongoose
                .model("competences")
                .findById(this._id);
              nom = doc?.nomCompetence;
            } else if (!nom && this._conditions?._id) {
              const doc = await mongoose
                .model("competences")
                .findById(this._conditions._id);
              nom = doc?.nomCompetence;
            }

            const validCodes =
              {
                outilsEtTechniquesScientifiques: ["CS1", "CS2"],
                compTechnologiques: ["CS3", "CS4", "CS5", "CS6", "CS7", "CS8"],
                autoDeveloppEtInnovation: ["CS9"],
                Communication: ["CS10", "CS11"],
              }[nom] || [];

            if (!validCodes.includes(value)) {
              throw new Error(`${value} n'est pas valide pour ${nom}.`);
            }
            resolve(true);
          } catch (error) {
            reject(error);
          }
        });
      },
      message: (props) => props.reason.message,
    },
  },

  descriptionCompetence: {
    type: String,
    required: true,
  },
  matieres: [{ type: mongoose.Schema.Types.ObjectId, ref: "matieres" }],
  archived: { type: Boolean, default: false }, // Champ pour archiver
});

export default mongoose.model("competences", competenceSchema);
