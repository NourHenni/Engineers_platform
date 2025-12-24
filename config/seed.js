import mongoose from "mongoose";
import User from "../src/models/userModel.js";
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
  }
  
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
