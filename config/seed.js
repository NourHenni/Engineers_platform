import mongoose from "mongoose";
import User from "../models/userModel.js";
import bcrypt from "bcrypt";

// Default users to seed
const defaultUsers = [
  {
    nom: "Admin",
    prenom: "User",
    cin: 12345678,
    adresseEmail: "admin@example.com",
    password: "admin123", // Plaintext password
    role: "admin",
    dateDeNaissance: "1980-01-01", // Add birthdate for admin
  },
  
  {
    nom: "Teacher",
    prenom: "User",
    cin: 87654321,
    adresseEmail: "teacher@example.com",
    password: "teacher123", // Plaintext password
    role: "enseignant",
    dateDeNaissance: "1985-02-14", // Add birthdate for teacher
  },
  {
    nom: "Student",
    prenom: "User",
    cin: 11223344,
    adresseEmail: "nourbenhenni687@gmail.com",
    password: "student123", // Plaintext password
    role: "etudiant",
    dateDeNaissance: "2000-06-15", // Add birthdate for student
  },
];

export const seedDatabase = async () => {
  try {
    for (const userData of defaultUsers) {
      // Check if the user already exists
      const existingUser = await User.findOne({
        adresseEmail: userData.adresseEmail,
      });
      if (!existingUser) {
        // Hash the password
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        // Create the user with the added dateDeNaissance field
        const user = new User({ ...userData, password: hashedPassword });
        await user.save();
        console.log(`User ${userData.adresseEmail} created successfully`);
      } else {
        console.log(`User ${userData.adresseEmail} already exists`);
      }
    }
    console.log("Database seeding completed");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
};





