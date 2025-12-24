import User from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import xlsx from "xlsx";
import { sendEmail } from "../../services/emailservice.js";
import pfaModel from "../models/pfaModel.js";
import stageEteModel from "../models/stageEteModel.js";
// Adjust the path as needed
import Matieres from "../models/matiereModel.js";
import Year from "../models/yearModel.js";
import Competences from "../models/competenceModel.js";

import nodemailer from "nodemailer";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

////////////////////////ALL USERS//////////////////////////
export const login = async (req, res) => {
  try {
    // Find the user by CIN
    let foundUser = await User.findOne({ cin: req.body.cin });
    if (!foundUser) {
      return res.status(401).json({
        message: "CIN ou mot de passe incorrect",
      });
    }

    // Check if the user is archived
    if (foundUser.archivee) {
      return res.status(403).json({
        message:
          "Votre compte est archivé. Veuillez contacter l'administrateur.",
      });
    }

    // Compare the provided password with the hashed password stored in the database
    const validPassword = await bcrypt.compare(
      req.body.password,
      foundUser.password
    );
    if (!validPassword) {
      return res.status(401).json({
        message: "CIN ou mot de passe incorrect",
      });
    }

    const token = jwt.sign(
      { userId: foundUser._id, role: foundUser.role }, // Add role to the token payload
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Respond with the token
    res.status(200).json({
      token,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
export const logout = async (req, res) => {
  try {
    // Perform any server-side cleanup if needed (e.g., logging user actions)

    res.status(200).json({
      message: "User logged out successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const FetchMe = (req, res) => {
  console.log("req: ");

  // Chercher l'utilisateur dans la base de données
  User.findOne({ _id: req.auth.userId })
    .then((user) => {
      if (user) {
        return res.json({ model: user }); // Renvoie le rôle de l'utilisateur
      }
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    })
    .catch((error) => {
      res.status(500).json({ message: "Erreur serveur", error: error.message });
    });
};

///////////////////////////////////////////////////////////
//////////////////////ETUDIANT/////////////////////////////
export const createEtudiant = async (req, res) => {
  try {
    // Set the default role to 'etudiant' if no role is provided
    if (!req.body.role) {
      req.body.role = "etudiant";
    }

    // Check if the role is 'etudiant', if not, return an error
    if (req.body.role !== "etudiant") {
      return res.status(403).json({
        success: false,
        message: "Only users with the role 'etudiant' can be created.",
      });
    }

    // Check if the email already exists in the database
    const foundUser = await User.findOne({
      adresseEmail: req.body.adresseEmail,
    });
    if (foundUser) {
      return res.status(400).json({
        success: false,
        message: "Email existe déjà", // Email already exists
      });
    }

    // Validate that the required fields are provided for 'etudiant'
    const requiredFields = [
      "situation",
      "baccalaureat",
      "annee_bac",
      "moyenne_bac",
      "mention",
      "est_prepa",
      "universite",
      "etablissement",
      "type_licence",
      "specialite",
      "annee_licence",
    ];

    for (const field of requiredFields) {
      if (req.body[field] === undefined || req.body[field] === null) {
        return res.status(400).json({
          success: false,
          message: `Le champ '${field}' est requis pour créer un étudiant.`,
        });
      }
    }

    // Extract year from dateDeNaissance
    const dateDeNaissance = new Date(req.body.dateDeNaissance);
    const birthYear = dateDeNaissance.getFullYear();

    // Generate the password: concat of nom + prenom + year of birth
    const generatedPassword = `${req.body.nom}${req.body.prenom}${birthYear}`;

    // Hash the generated password before saving
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    // Create the new user object
    const user = new User({
      ...req.body,
      password: hashedPassword,
    });

    // Save the new user to the database
    await user.save();

    // Remove the password from the response data for security
    const { password, ...newUser } = user.toObject();

    // Send the email with CIN and password
    try {
      await sendEmail(
        req.body.adresseEmail,
        req.body.prenom,
        req.body.nom,
        req.body.cin,
        generatedPassword
      );
    } catch (emailError) {
      console.error("Failed to send email:", emailError.message);
      return res.status(500).json({
        success: false,
        message: "User created, but failed to send email.",
      });
    }

    // Return the newly created user without the password
    res.status(200).json({
      model: newUser,
      generatedPassword, // Optional: return the generated password for reference
      message: "success",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
export const getEtudiants = async (req, res) => {
  try {
    const { year } = req.body;

    // Construct the query object
    const query = { role: "etudiant" };

    // If a year is provided in the request body, add it to the query
    if (year) {
      query.annee_entree_isamm = { $lt: year }; // Students with annee_entree_isamm < year
    }

    // Fetch the students based on the constructed query
    const users = await User.find(query);

    res.status(200).json({
      model: users,
      message: "success",
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

export const getEtudiantById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ _id: id, role: "etudiant" });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found or not an etudiant",
      });
    }

    res.status(200).json({
      success: true,
      model: user,
      message: "User retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const updateEtudiantById = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Find the user first to compare the CIN
    const existingUser = await User.findById(id);

    if (!existingUser || existingUser.role !== "etudiant") {
      return res.status(404).json({
        success: false,
        message: "User not found or not an etudiant",
      });
    }

    // Check if CIN is being updated
    const isCINUpdated = updateData.cin && updateData.cin !== existingUser.cin;

    // Update the user
    const updatedUser = await User.findOneAndUpdate(
      { _id: id, role: "etudiant" },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found or not an etudiant",
      });
    }

    // Send email if CIN is updated
    if (isCINUpdated) {
      try {
        await sendEmail(
          updatedUser.adresseEmail,
          updatedUser.prenom,
          updatedUser.nom,
          updatedUser.cin, // New CIN
          "Votre CIN a été mis à jour avec succès." // Optional message
        );
      } catch (emailError) {
        console.error("Error sending email:", emailError.message);
        return res.status(500).json({
          success: false,
          message: "User updated, but failed to send email.",
        });
      }
    }

    res.status(200).json({
      success: true,
      model: updatedUser,
      message: "User updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const updateEtudiantPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { nouveau, confirmationNouveau } = req.body;

    // Check if the new password matches the confirmation
    if (nouveau !== confirmationNouveau) {
      return res.status(400).json({
        success: false,
        message: "Le nouveau mot de passe et la confirmation ne sont pas égaux",
      });
    }

    // Find the user by ID and role
    const user = await User.findOne({ _id: id, role: "etudiant" });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé ou pas un étudiant",
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(nouveau, 10);

    // Update the password directly in the database
    await User.updateOne({ _id: id }, { $set: { password: hashedPassword } });

    // Optionally, send a notification email
    try {
      await sendEmail(
        user.adresseEmail,
        user.nom,
        user.prenom,
        user.cin,
        nouveau
      );
    } catch (emailError) {
      console.error("Échec de l'envoi de l'email:", emailError.message);
      return res.status(500).json({
        success: false,
        message: "Mot de passe modifié, mais l'email n'a pas pu être envoyé.",
      });
    }

    // Respond with success
    res.status(200).json({
      success: true,
      message: "Mot de passe modifié avec succès et un email a été envoyé",
    });
  } catch (error) {
    // Handle unexpected errors
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const deleteOrArchiveStudentById = async (req, res) => {
  try {
    const { action } = req.body; // Expecting "delete" or "archive"
    const { id } = req.params; // ID of the student to be processed

    // Find the student by ID
    const student = await User.findById(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Étudiant non trouvé",
      });
    }

    // Check if the user is a student
    if (student.role !== "etudiant") {
      return res.status(403).json({
        success: false,
        message: "Action non autorisée pour ce rôle",
      });
    }

    // Perform the action based on the "action" parameter
    if (action === "delete") {
      await User.findByIdAndDelete(id); // Permanently delete the student
      return res.status(200).json({
        success: true,
        message: "Étudiant supprimé avec succès",
      });
    } else if (action === "archive") {
      // Archive the student by updating only the `archivee` field
      await User.updateOne(
        { _id: id },
        { $set: { archivee: true } } // Only update the `archivee` field
      );
      return res.status(200).json({
        success: true,
        message: "Étudiant archivé avec succès",
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Action invalide. Utilisez 'delete' ou 'archive'.",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const addStudentsFromFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded.",
      });
    }

    // Parse the Excel file
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const studentsData = xlsx.utils.sheet_to_json(sheet);

    // Loop through each student record
    for (let student of studentsData) {
      const {
        nom,
        prenom,
        cin,
        genre,
        dateDeNaissance,
        gouvernorat,
        addresse,
        ville,
        code_postal,
        nationalite,
        telephone,
        annee_entree_isamm,
        adresseEmail,
        situation,
        baccalaureat,
        annee_bac,
        moyenne_bac,
        mention,
        est_prepa,
        universite,
        etablissement,
        type_licence,
        specialite,
        annee_licence,
        annee_sortie_isamm,
      } = student;

      // Validate required fields
      if (
        !nom ||
        !prenom ||
        !cin ||
        !adresseEmail ||
        !dateDeNaissance ||
        !genre ||
        !gouvernorat ||
        !addresse ||
        !ville ||
        !code_postal ||
        !nationalite ||
        !telephone ||
        !annee_entree_isamm
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Incorrect file format. Ensure all required fields are present.",
        });
      }

      // Check if CIN already exists
      const existingStudent = await User.findOne({ cin });
      if (existingStudent) {
        return res.status(400).json({
          success: false,
          message: `CIN ${cin} already exists. Please correct the file.`,
        });
      }

      // Generate password
      const yearOfBirth = new Date(dateDeNaissance).getFullYear();
      const password = `${nom}${prenom}${yearOfBirth}`;
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create a new student
      const newStudent = new User({
        nom,
        prenom,
        cin,
        genre,
        dateDeNaissance,
        gouvernorat,
        addresse,
        ville,
        code_postal,
        nationalite,
        telephone,
        annee_entree_isamm,
        adresseEmail,
        password: hashedPassword,
        role: "etudiant",
        archivee: false,
        situation,
        baccalaureat,
        annee_bac,
        moyenne_bac,
        mention,
        est_prepa,
        universite,
        etablissement,
        type_licence,
        specialite,
        annee_licence,
        annee_sortie_isamm,
      });

      // Save the student and send email
      await newStudent.save();
      await sendEmail(adresseEmail, prenom, nom, cin, password);
    }

    res.status(201).json({
      success: true,
      message: "Students created successfully, and emails have been sent.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const batchUpdateStudentSituation = async (req, res) => {
  try {
    const { studentIds, nouvelleSituation, anneeAcademique } = req.body;

    // Validate input
    const validSituations = ["passe", "redouble", "diplome"];
    if (!validSituations.includes(nouvelleSituation)) {
      return res.status(400).json({ error: "Invalid situation value" });
    }

    if (!anneeAcademique || !/^\d{4}-\d{4}$/.test(anneeAcademique)) {
      return res.status(400).json({
        error: "Invalid or missing academic year format (e.g., 2024-2025)",
      });
    }

    const students = await User.find({ _id: { $in: studentIds } });

    if (students.length !== studentIds.length) {
      return res.status(404).json({ error: "Some students not found" });
    }

    // Check if any student is already graduated
    const graduatedStudents = students.filter(
      (s) => s.situation === "diplome" && nouvelleSituation !== "diplome"
    );
    if (graduatedStudents.length > 0) {
      return res.status(400).json({
        error: `Cannot modify situation for ${graduatedStudents.length} graduated students`,
        graduatedStudents: graduatedStudents.map((s) => s._id),
      });
    }

    const updatePromises = students.map(async (student) => {
      // Save previous situation
      const previousSituation = student.situation;

      // Update situation
      if (nouvelleSituation === "passe") {
        if (student.niveau < 3) {
          student.niveau += 1;
          student.situation = "passe";
        } else if (student.niveau === 3) {
          student.situation = "diplome";
          student.annee_sortie_isamm = new Date().getFullYear();
        }
      } else {
        student.situation = nouvelleSituation;
      }

      // Update academic status
      const existingStatusIndex = student.academic_statuses.findIndex(
        (status) => status.academic_year === anneeAcademique
      );

      if (student.situation === "diplome" && existingStatusIndex === -1) {
        return null; // Skip this student
      }

      if (existingStatusIndex !== -1) {
        student.academic_statuses[existingStatusIndex].status =
          student.situation;
      } else {
        student.academic_statuses.push({
          academic_year: anneeAcademique,
          status: student.situation,
        });
      }

      return student.save();
    });

    const results = await Promise.all(updatePromises);
    const successfulUpdates = results.filter((r) => r !== null);

    res.status(200).json({
      message: `${successfulUpdates.length} student situations updated successfully`,
      skipped: results.length - successfulUpdates.length,
      students: successfulUpdates,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const updateStudentSituation = async (req, res) => {
  try {
    const { id } = req.params;
    const { nouvelleSituation, anneeAcademique } = req.body;

    // Validate input
    const validSituations = ["passe", "redouble", "diplome"];
    if (!validSituations.includes(nouvelleSituation)) {
      return res.status(400).json({ error: "Invalid situation value" });
    }

    if (!anneeAcademique || !/^\d{4}-\d{4}$/.test(anneeAcademique)) {
      return res.status(400).json({
        error: "Invalid or missing academic year format (e.g., 2024-2025)",
      });
    }

    // Find the student
    const student = await User.findById(id);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Prevent modification if the student is already graduated
    // Only prevent if trying to change FROM graduated status
    if (student.situation === "diplome" && nouvelleSituation !== "diplome") {
      return res
        .status(400)
        .json({ error: "Cannot modify situation for graduated student" });
    }

    // Save previous situation for comparison
    const previousSituation = student.situation;

    // Handle the situation update
    if (nouvelleSituation === "passe") {
      if (student.niveau < 3) {
        student.niveau += 1;
        student.situation = "passe";
      } else if (student.niveau === 3) {
        student.situation = "diplome";
        student.annee_sortie_isamm = new Date().getFullYear();
      }
    } else {
      student.situation = nouvelleSituation;
    }

    // Check again: if the situation is diplome now and no status entry exists yet, block
    const existingStatusIndex = student.academic_statuses.findIndex(
      (status) => status.academic_year === anneeAcademique
    );

    if (student.situation === "diplome" && existingStatusIndex === 0) {
      return res.status(400).json({
        error: "Cannot add a new academic status for a graduated student",
      });
    }

    if (existingStatusIndex !== -1) {
      // Update existing status entry
      student.academic_statuses[existingStatusIndex].status = student.situation;
      student.academic_statuses[existingStatusIndex].niveau = student.niveau;
    } else {
      // Add new academic year entry
      student.academic_statuses.push({
        academic_year: anneeAcademique,
        status: student.situation,
        niveau: student.niveau,
      });
    }

    await student.save();

    res.status(200).json({
      message: "Situation and academic status updated successfully",
      student,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createAcademicYear = async (req, res) => {
  try {
    const { anneeUniversitaire } = req.body;

    if (!anneeUniversitaire) {
      return res.status(400).json({ error: "année universitaire is required" });
    }

    // Check if the year already exists

    // Create a new year
    const newYear = new Year({ year: anneeUniversitaire });
    await newYear.save();

    // Update students' data for the new year
    await User.updateMany(
      {},
      {
        $set: {
          stageete: null, // Clear internships
          pfas: [],
          pfa: null, // Clear PFA
        },
      }
    );

    await Matieres.updateMany(
      {},
      {
        $set: {
          enseignant: null, // Clear enseignant
        },
      }
    );

    res.status(201).json({ message: "New academic year created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getCV = async (req, res) => {
  try {
    // Determine which user ID to use (either logged-in user or specified ID)
    const userId = req.params.id === "me" ? req.auth.userId : req.params.id;

    // Find the Pfa object where etudiant matches the user ID
    const pfa = await pfaModel.findOne({ etudiants: userId });

    // Find the StageEte object where etudiant matches the user ID
    const stageEte = await stageEteModel.findOne({ etudiant: userId });

    // Find the user's cvinfos
    const user = await User.findById(userId);
    const cvinfos = user ? user.cvinfos : [];

    // Check if no Pfa or StageEte found
    if (!pfa && !stageEte && cvinfos.length === 0) {
      return res.status(404).json({
        message: "No Pfa, StageEte or CV info found for the given student ID",
      });
    }

    res.status(200).json({
      cv: {
        pfa: pfa || null,
        stageEte: stageEte || null,
        cvinfos: cvinfos || [], // Include cvinfos
      },
      message: "success",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const addCVInfo = async (req, res) => {
  try {
    const { diplomes, certifications, langues, experiences } = req.body;

    // Vérification si au moins une des informations est fournie
    if (!diplomes && !certifications && !langues && !experiences) {
      return res
        .status(400)
        .json({ message: "At least one CV field is required" });
    }

    const userId = req.auth.userId; // Extraire l'ID de l'utilisateur du middleware d'authentification

    // Trouver l'utilisateur et mettre à jour les champs spécifiques du CV
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          "cvinfos.diplomes": diplomes || [], // Mettre à jour les diplômes (s'il y en a)
          "cvinfos.certifications": certifications || [], // Mettre à jour les certifications
          "cvinfos.langues": langues || [], // Mettre à jour les langues
          "cvinfos.experiences": experiences || [], // Mettre à jour les expériences professionnelles
        },
      },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "CV information updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const basculerEntreAnnee = async (req, res) => {
  try {
    const { year } = req.params; // Extraire l'année de la requête

    // Étape 1 : Obtenir la liste des utilisateurs dont annee_entree_isamm est <= l'année fournie
    const users = await User.find({
      annee_entree_isamm: { $lte: year },
      role: "etudiant",
    });

    // Étape 2 : Ajouter le statut pour l'année demandée pour chaque étudiant
    const usersWithStatus = users.map((user) => {
      // Trouver le statut pour l'année académique spécifiée dans academic_statuses
      const statusForYear = user.academic_statuses.find((status) => {
        // Comparer l'année de statut avec l'année donnée (en prenant la première année de la plage)
        const [startYear] = status.academic_year.split("-");
        return parseInt(startYear, 10) === parseInt(year, 10); // Comparer avec l'année de début
      });

      return {
        ...user.toObject(),
        statusForYear: statusForYear ? statusForYear.status : "Non défini", // Si pas trouvé, "Non défini"
      };
    });

    // Étape 3 : Récupérer la liste des PFAs et StageEtes pour l'année spécifiée
    const pfas = await pfaModel.find({ annee: year });
    const stagesEte = await stageEteModel.find({ anneeStage: year });

    // Étape 4 : Récupérer toutes les compétences
    const competences = await Competences.find();

    // Étape 5 : Récupérer toutes les matières (vous pouvez filtrer selon le semestre ou d'autres critères)
    const matieres = await Matieres.find();

    // Étape 6 : Envoyer les utilisateurs avec leurs statuts, PFAs, StageEtes, Compétences et Matières
    res.status(200).json({
      message: "success",
      users: usersWithStatus,
      pfas: pfas,
      stagesEte: stagesEte,
      competences: competences,
      matieres: matieres,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: error.message,
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    // Use the user ID from the authMiddleware (attached to req.auth)
    const userId = req.auth.userId;

    const { adresseEmail, addresse, telephone } = req.body;

    // Validate the email format
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (adresseEmail && !emailRegex.test(adresseEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Validate phone number format (optional)
    if (telephone && !/^\d{8,10}$/.test(telephone)) {
      return res.status(400).json({ error: "Invalid phone number format" });
    }

    // Find the logged-in user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update the fields if provided
    if (adresseEmail) {
      user.adresseEmail = adresseEmail;
    }
    if (addresse) {
      user.addresse = addresse;
    }
    if (telephone) {
      user.telephone = telephone;
    }

    // Save the updated user data
    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/////////////////////////////////////////////////////////////
//////////////////////ENSEIGNANT//////////////////////////
export const createEnseignant = async (req, res) => {
  try {
    // Set the default role to 'enseignant' if no role is provided
    if (!req.body.role) {
      req.body.role = "enseignant";
    }

    // Check if the role is 'enseignant', if not, return an error
    if (req.body.role !== "enseignant") {
      return res.status(403).json({
        success: false,
        message: "Only users with the role 'enseignant' can be created.",
      });
    }

    // Check if the email already exists in the database
    const foundUser = await User.findOne({
      adresseEmail: req.body.adresseEmail,
    });
    if (foundUser) {
      return res.status(400).json({
        success: false,
        message: "Email existe déjà", // Email already exists
      });
    }

    // Validate that dateDeNaissance is provided
    if (!req.body.dateDeNaissance) {
      return res.status(400).json({
        success: false,
        message: "La date de naissance est requise.", // Date of birth is required
      });
    }

    // Validate that grade is provided
    if (!req.body.grade) {
      return res.status(400).json({
        success: false,
        message: "Le champ 'grade' est requis pour créer un enseignant.", // Grade is required for enseignant
      });
    }

    // Extract year from dateDeNaissance
    const dateDeNaissance = new Date(req.body.dateDeNaissance);
    const birthYear = dateDeNaissance.getFullYear();

    // Generate the password: concat of nom + prenom + year of birth
    const generatedPassword = `${req.body.nom}${req.body.prenom}${birthYear}`;

    // Hash the generated password before saving
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    // Create the new user object
    const user = new User({
      ...req.body,
      password: hashedPassword,
    });

    // Save the new user to the database
    await user.save();

    // Remove the password from the response data for security
    const { password, ...newUser } = user.toObject();

    // Send the email with CIN and password
    try {
      await sendEmail(
        req.body.adresseEmail,
        req.body.prenom,
        req.body.nom,
        req.body.cin,
        generatedPassword
      );
    } catch (emailError) {
      console.error("Failed to send email:", emailError.message);
      return res.status(500).json({
        success: false,
        message: "User created, but failed to send email.",
      });
    }
    // Return the newly created user without the password
    res.status(200).json({
      model: newUser,
      generatedPassword, // Optional: return the generated password for reference
      message: "success",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
export const getEnseignants = async (req, res) => {
  try {
    const users = await User.find({ role: "enseignant" });
    res.status(200).json({
      model: users,
      message: "success",
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};
export const getEnseignantById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ _id: id, role: "enseignant" });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found or not an enseignant",
      });
    }

    res.status(200).json({
      success: true,
      model: user,
      message: "User retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const updateEnseignantById = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Retrieve the existing user before update to compare CIN
    const existingUser = await User.findOne({ _id: id, role: "enseignant" });
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found or not an enseignant",
      });
    }

    // Check if CIN is being updated
    const isCINUpdated = existingUser.cin !== updateData.cin;

    const updatedUser = await User.findOneAndUpdate(
      { _id: id, role: "enseignant" },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found or not an enseignant",
      });
    }

    // If CIN is updated, send an email
    if (isCINUpdated) {
      await sendEmail(
        updatedUser.adresseEmail,
        updatedUser.nom,
        updatedUser.prenom,
        updatedUser.cin,
        updatedUser.password
      );
    }

    res.status(200).json({
      success: true,
      model: updatedUser,
      message: "User updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const updateEnseignantPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { nouveau, confirmationNouveau } = req.body;

    if (nouveau !== confirmationNouveau) {
      return res.status(400).json({
        success: false,
        message: "Le nouveau mot de passe et la confirmation ne sont pas égaux",
      });
    }

    const user = await User.findOne({ _id: id, role: "enseignant" });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé ou pas un enseignant",
      });
    }

    const hashedPassword = await bcrypt.hash(nouveau, 10);
    user.password = hashedPassword;
    await user.save();

    // Send email with the new password
    await sendEmail(
      user.adresseEmail,
      user.nom,
      user.prenom,
      user.cin,
      nouveau
    );

    res.status(200).json({
      success: true,
      message: "Mot de passe modifié avec succès et un email a été envoyé",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const deleteOrArchiveEnseignantById = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // action can be 'delete' or 'archive'

    // Find the enseignant by ID and check if they exist
    const enseignant = await User.findOne({ _id: id, role: "enseignant" });

    if (!enseignant) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé ou pas un enseignant",
      });
    }

    // Perform the action based on the 'action' parameter
    if (action === "delete") {
      await User.findByIdAndDelete(id); // Permanently delete the enseignant
      return res.status(200).json({
        success: true,
        message: "Utilisateur supprimé avec succès",
      });
    } else if (action === "archive") {
      enseignant.archivee = true; // Set the archivee attribute to true
      await enseignant.save();
      return res.status(200).json({
        success: true,
        message: "Utilisateur archivé avec succès",
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Action invalide. Utilisez 'delete' ou 'archive'.",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const addTeachersFromFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded.",
      });
    }

    // Parse the Excel file
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const teachersData = xlsx.utils.sheet_to_json(sheet);

    // Loop through each teacher record
    for (let teacher of teachersData) {
      const {
        nom,
        prenom,
        cin,
        genre,
        dateDeNaissance,
        gouvernorat,
        addresse,
        ville,
        code_postal,
        nationalite,
        telephone,
        annee_entree_isamm,
        adresseEmail,
        grade,
      } = teacher;

      // Validate required fields
      if (
        !nom ||
        !prenom ||
        !cin ||
        !adresseEmail ||
        !dateDeNaissance ||
        !genre ||
        !gouvernorat ||
        !addresse ||
        !ville ||
        !code_postal ||
        !nationalite ||
        !telephone ||
        !annee_entree_isamm ||
        !grade
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Incorrect file format. Ensure all required fields are present.",
        });
      }

      // Check if CIN already exists
      const existingTeacher = await User.findOne({ cin });
      if (existingTeacher) {
        return res.status(400).json({
          success: false,
          message: `CIN ${cin} already exists. Please correct the file.`,
        });
      }

      // Generate password
      const yearOfBirth = new Date(dateDeNaissance).getFullYear();
      const password = `${nom}${prenom}${yearOfBirth}`;
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create a new teacher
      const newTeacher = new User({
        nom,
        prenom,
        cin,
        genre,
        dateDeNaissance,
        gouvernorat,
        addresse,
        ville,
        code_postal,
        nationalite,
        telephone,
        annee_entree_isamm,
        adresseEmail,
        grade,
        password: hashedPassword,
        role: "enseignant",
        archivee: false,
      });

      // Save the teacher and send email
      await newTeacher.save();
      await sendEmail(adresseEmail, prenom, nom, cin, password);
    }

    res.status(201).json({
      success: true,
      message: "Teachers created successfully, and emails have been sent.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const notifyUsersWithDiplome = async (req, res) => {
  try {
    // Get all users with situation = 'diplome'
    const users = await User.find({ situation: "diplome" });

    if (users.length === 0) {
      return res
        .status(404)
        .json({ message: "No users found with situation 'diplome'." });
    }

    // Send email to each user
    for (let user of users) {
      await sendEmailold(user.adresseEmail, user.firstName, user.lastName);
    }

    res.status(200).json({
      message:
        "Emails sent successfully to all users with situation 'diplome'.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error sending email notifications." });
  }
};
////////////////////////////////////////////////////////////////////

// Create a reusable transporter object using environment variables for configuration
const transporter = nodemailer.createTransport({
  service: process.env.MAILER_SERVICE_PROVIDER, // Use the email service provider from env
  host: process.env.HOST, // SMTP host
  port: process.env.PORT_SLL, // SSL port
  secure: true, // Use secure connection
  auth: {
    user: process.env.MAILER_EMAIL_ID, // Sender's email from env
    pass: process.env.MAILER_PASSWORD, // Sender's email password or app password from env
  },
});

// Define the sendEmail function
const sendEmailold = async (to, firstName, lastName) => {
  const mailOptions = {
    from: process.env.MAILER_EMAIL_ID, // Sender's email from env
    to: to,
    subject: "Update Your CV on the Platform",
    text: `Dear ${firstName} ${lastName},\n\nWe noticed that your situation is marked as 'diplome'. Please remember to update your CV on the platform.\n\nBest regards, The Team.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully to:", to);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Error sending email");
  }
};
