import User from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import xlsx from 'xlsx';
import { sendEmail } from "../services/emailservice.js";



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
    const foundUser = await User.findOne({ adresseEmail: req.body.adresseEmail });
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

    // Send the email with the new password
    await sendEmail(user.adresseEmail, user.nom, user.prenom, user.cin, nouveau);

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
      if (!nom || !prenom || !cin || !adresseEmail || !dateDeNaissance || !genre || !gouvernorat || !addresse || !ville || !code_postal || !nationalite || !telephone || !annee_entree_isamm) {
        return res.status(400).json({
          success: false,
          message: "Incorrect file format. Ensure all required fields are present.",
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

    // Retrieve the existing user before update to compare CIN
    const existingUser = await User.findOne({ _id: id, role: 'enseignant' });
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found or not an enseignant",
      });
    }

    // Check if CIN is being updated
    const isCINUpdated = existingUser.cin !== updateData.cin;

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

    // If CIN is updated, send an email
    if (isCINUpdated) {
      await sendEmail(updatedUser.adresseEmail, updatedUser.nom, updatedUser.prenom, updatedUser.cin, updatedUser.password);
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

    // Send email with the new password
    await sendEmail(user.adresseEmail, user.nom, user.prenom, user.cin, nouveau);

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
      if (!nom || !prenom || !cin || !adresseEmail || !dateDeNaissance || !genre || !gouvernorat || !addresse || !ville || !code_postal || !nationalite || !telephone || !annee_entree_isamm || !grade) {
        return res.status(400).json({
          success: false,
          message: "Incorrect file format. Ensure all required fields are present.",
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
////////////////////////////////////////////////////////////////////

















