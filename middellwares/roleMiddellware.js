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
<<<<<<< HEAD
export const isAdminOrTeacher = (req, res, next) => {
=======

export const isAdminOrEnseignant = (req, res, next) => {
>>>>>>> cbbc03827cef5927e3a2fdcc90d48f13040e5d78
  const userRole = req.auth.role;

  if (userRole === "admin" || userRole === "enseignant") {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Accès refusé : Vous devez être admin ou enseignant.",
  });
};
<<<<<<< HEAD

=======
>>>>>>> cbbc03827cef5927e3a2fdcc90d48f13040e5d78
