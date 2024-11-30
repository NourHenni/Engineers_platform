import User from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const createUser = async (req, res) => {
  try {
    let foundUser = await User.findOne({ adresseEmail: req.body.adresseEmail });
    if (foundUser) {
      res.status(400).json({
        success: false,
        message: "Email existe déjà",
      });
    } else {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      const user = new User({
        ...req.body,
        password: hashedPassword,
      });
      await user.save();
      const { password, ...newUser } = user.toObject();
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

export const getUsers = async (req, res) => {
  try {
    const users = await User.find();
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
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params; // Extract the user ID from the request parameters

    // Find the user by ID
    const user = await User.findById(id);

    // Check if the user exists
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Send the user data
    res.status(200).json({
      success: true,
      model: user,
      message: "User retrieved successfully",
    });
  } catch (error) {
    // Handle any errors
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const updateUserById = async (req, res) => {
  try {
    const { id } = req.params; // Extract user ID from request parameters
    const updateData = req.body; // Extract fields to be updated from request body

    // Find the user by ID and update with new data
    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true } // Return the updated user and run validation
    );

    // If user not found, return 404
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Respond with the updated user
    res.status(200).json({
      success: true,
      model: updatedUser,
      message: "User updated successfully",
    });
  } catch (error) {
    // Handle errors
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const updatePassword = async (req, res) => {
  try {
    const { id } = req.params; // Extract user ID from route parameters
    const { nouveau, confirmationNouveau } = req.body; // Extract new password and confirmation

    // Check if new password and confirmation match
    if (nouveau !== confirmationNouveau) {
      return res.status(400).json({
        success: false,
        message: "Le nouveau mot de passe et la confirmation ne sont pas égaux",
      });
    }

    // Find the user by ID
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(nouveau, 10);

    // Update the user's password
    user.password = hashedPassword;
    await user.save();

    // Respond with success
    res.status(200).json({
      success: true,
      message: "Mot de passe modifié avec succès",
    });
  } catch (error) {
    // Handle errors
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const deleteUserById = async (req, res) => {
  try {
    const { id } = req.params; // Extract user ID from route parameters

    // Attempt to find and delete the user
    const deletedUser = await User.findByIdAndDelete(id);

    // Check if user exists
    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    // Respond with success message
    res.status(200).json({
      success: true,
      message: "Utilisateur supprimé avec succès",
    });
  } catch (error) {
    // Handle errors
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
