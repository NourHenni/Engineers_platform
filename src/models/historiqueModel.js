import mongoose from 'mongoose';

const HistoriqueSchema = new mongoose.Schema({
  matiere: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Matiere',
    required: true
  },
  action: {
    type: String,
    required: true // Par exemple "Modification", "Création"
  },
  ancienneValeur: {
    type: mongoose.Schema.Types.Mixed, // Pour stocker l'ancienne valeur de la matière
    required: true
  },
  nouvelleValeur: {
    type: mongoose.Schema.Types.Mixed, // Pour stocker la nouvelle valeur
    required: true
  },
  utilisateur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dateModification: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Historique', HistoriqueSchema);

