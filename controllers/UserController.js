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
    let foundUser = await User.findOne({ adresseEmail: req.body.adresseEmail });
    if (!foundUser) {
      return res.status(401).json({
        message: "login incorrect",
      });
    }
    const validpassword = await bcrypt.compare(
      req.body.password,
      foundUser.password
    );

    if (!validpassword) {
      return res.status(401).json({
        message: "login ou mot de passe incorrectes",
      });
    }

    res.status(200).json({
      token: jwt.sign({ userId: foundUser._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      }),
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
