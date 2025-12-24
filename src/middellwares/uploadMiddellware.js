import multer from "multer";

// Configuration de Multer pour stocker les fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Répertoire où les fichiers seront sauvegardés
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); // Nom unique pour chaque fichier
  },
});

// Filtre pour accepter uniquement les fichiers PDF
const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Seuls les fichiers PDF sont autorisés"), false);
  }
};

// Middleware Multer
export const upload = multer({ storage: storage, fileFilter: fileFilter });