import User from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const createEtudiant = async (req, res) => {
  try {
    // Set the default role to 'etudiant' if no role is provided
    if (!req.body.role) {
      req.body.role = 'etudiant';
    }

    // Check if the role is 'etudiant', if not, return an error
    if (req.body.role !== 'etudiant') {
      return res.status(403).json({
        success: false,
        message: "Only users with the role 'etudiant' can be created.",
      });
    }

    // Check if the email already exists in the database
    let foundUser = await User.findOne({ adresseEmail: req.body.adresseEmail });
    if (foundUser) {
      return res.status(400).json({
        success: false,
        message: "Email existe déjà",  // Email already exists
      });
    } else {
      // Hash the password before saving
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
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
        message: "success",
      });
    }
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

export const deleteEtudiantById = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedUser = await User.findOneAndDelete({ _id: id, role: 'etudiant' });

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé ou pas un étudiant",
      });
    }

    res.status(200).json({
      success: true,
      message: "Utilisateur supprimé avec succès",
    });
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
      req.body.role = 'enseignant';
    }

    // Check if the role is 'enseignant', if not, return an error
    if (req.body.role !== 'enseignant') {
      return res.status(403).json({
        success: false,
        message: "Only users with the role 'enseignant' can be created.",
      });
    }

    // Check if the email already exists in the database
    let foundUser = await User.findOne({ adresseEmail: req.body.adresseEmail });
    if (foundUser) {
      return res.status(400).json({
        success: false,
        message: "Email existe déjà",  // Email already exists
      });
    } else {
      // Hash the password before saving
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
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
        message: "success",
      });
    }
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

export const deleteEnseignantById = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedUser = await User.findOneAndDelete({ _id: id, role: 'enseignant' });

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé ou pas un enseignant",
      });
    }

    res.status(200).json({
      success: true,
      message: "Utilisateur supprimé avec succès",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const login = async (req, res) => {
  try {
    // Find the user by CIN instead of email
    let foundUser = await User.findOne({ cin: req.body.cin });
    if (!foundUser) {
      return res.status(401).json({
        message: "CIN ou mot de passe incorrect",
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
