import userModel from "../models/userModel.js";
const hasRole = (role) => {
  return (req, res, next) => {
    try {
      if (req.auth && req.auth.role === role) {
        next(); // L'utilisateur a le rôle approprié, on continue
      } else {
        res
          .status(403)
          .json({ error: "Forbidden: You do not have the required role." });
      }
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  };
};

export const isEnseignantOrEtudiant = (req, res, next) => {
  const userRole = req.auth.role;

  if (userRole === "enseignant" || userRole === "etudiant") {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Accès refusé : Vous devez être enseignant ou étudiant.",
  });
};

// Export des middlewares spécifiques pour chaque rôle
export const isAdmin = hasRole("admin");
export const isEnseignant = hasRole("enseignant");
export const isEtudiant = hasRole("etudiant");

export const isAdminOrStudent = (req, res, next) => {
  const userRole = req.auth.role;

  if (userRole === "admin" || userRole === "etudiant") {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Accès refusé : Vous devez être admin ou étudiant.",
  });
};

export const isAdminOrEnseignant = (req, res, next) => {
  const userRole = req.auth.role;

  if (userRole === "admin" || userRole === "enseignant") {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Accès refusé : Vous devez être admin ou enseignant.",
  });
};

export const isStillStudent = async (req, res, next) => {
  try {
    const userId = req.auth.userId; // ID de l'utilisateur authentifié
    const user = await userModel.findById(userId); // Rechercher l'utilisateur dans la base de données

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur introuvable.",
      });
    }

    // Vérifier si le rôle est "etudiant" et si l'utilisateur n'est pas encore diplômé
    if (user.role === "etudiant" && user.isGraduated === "not_graduated") {
      return next(); // L'utilisateur est encore étudiant, on continue
    }

    return res.status(403).json({
      success: false,
      message:
        "Accès refusé : Vous devez être étudiant non diplômé pour accéder à cette ressource.",
    });
  } catch (error) {
    console.error("Erreur dans le middleware isStillStudent :", error.message);
    res.status(500).json({
      success: false,
      message: "Erreur serveur. Veuillez réessayer plus tard.",
      error: error.message,
    });
  }
};
export const isStudent = (req, res, next) => {
  const userRole = req.auth.role;

  if (userRole === "etudiant") {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Accès refusé : Vous devez être étudiant.",
  });
};