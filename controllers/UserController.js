import User from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import xlsx from 'xlsx';
import { sendEmail } from "../services/emailservice.js";


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
    const foundUser = await User.findOne({ adresseEmail: req.body.adresseEmail });
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
    const users = await User.find({ role: 'etudiant' });
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
    const user = await User.findOne({ _id: id, role: 'etudiant' });

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

    const updatedUser = await User.findOneAndUpdate(
      { _id: id, role: 'etudiant' },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found or not an etudiant",
      });
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

    if (nouveau !== confirmationNouveau) {
      return res.status(400).json({
        success: false,
        message: "Le nouveau mot de passe et la confirmation ne sont pas égaux",
      });
    }

    const user = await User.findOne({ _id: id, role: 'etudiant' });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé ou pas un étudiant",
      });
    }

    const hashedPassword = await bcrypt.hash(nouveau, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Mot de passe modifié avec succès",
    });
  } catch (error) {
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

    // Check if the user is an student
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
      student.archivee = true; // Set the archivee attribute to true
      await student.save();
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
    const foundUser = await User.findOne({ adresseEmail: req.body.adresseEmail });
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
    const users = await User.find({ role: 'enseignant' });
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
    const user = await User.findOne({ _id: id, role: 'enseignant' });

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

    const updatedUser = await User.findOneAndUpdate(
      { _id: id, role: 'enseignant' },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found or not an enseignant",
      });
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

    const user = await User.findOne({ _id: id, role: 'enseignant' });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé ou pas un enseignant",
      });
    }

    const hashedPassword = await bcrypt.hash(nouveau, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Mot de passe modifié avec succès",
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
    const enseignant = await User.findOne({ _id: id, role: 'enseignant' });

    if (!enseignant) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé ou pas un enseignant",
      });
    }

    // Perform the action based on the 'action' parameter
    if (action === 'delete') {
      await User.findByIdAndDelete(id); // Permanently delete the enseignant
      return res.status(200).json({
        success: true,
        message: "Utilisateur supprimé avec succès",
      });
    } else if (action === 'archive') {
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
        message: "Votre compte est archivé. Veuillez contacter l'administrateur.",
      });
    }

    // Compare the provided password with the hashed password stored in the database
    const validPassword = await bcrypt.compare(req.body.password, foundUser.password);
    if (!validPassword) {
      return res.status(401).json({
        message: "CIN ou mot de passe incorrect",
      });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: foundUser._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

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




export const addStudentsFromFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded.",
      });
    }

    // Parse the Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const studentsData = xlsx.utils.sheet_to_json(sheet);

    for (let student of studentsData) {
      const { nom, prenom, cin, adresseEmail, dateDeNaissance } = student;

      if (!nom || !prenom || !cin || !adresseEmail || !dateDeNaissance) {
        return res.status(400).json({
          success: false,
          message: "Incorrect file format. Ensure all required fields are present.",
        });
      }

      const existingStudent = await User.findOne({ cin });
      if (existingStudent) {
        return res.status(400).json({
          success: false,
          message: `CIN ${cin} already exists. Please correct the file.`,
        });
      }

      const yearOfBirth = new Date(dateDeNaissance).getFullYear();
      const password = `${nom}${prenom}${yearOfBirth}`;
      const hashedPassword = await bcrypt.hash(password, 10);

      const newStudent = new User({
        nom,
        prenom,
        cin,
        adresseEmail,
        password: hashedPassword,
        role: 'etudiant',
        dateDeNaissance,
        archivee: false,  // Assuming students are not archived by default
      });

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