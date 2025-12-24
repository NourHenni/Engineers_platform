import mongoose from "mongoose";

const yearSchema = new mongoose.Schema({
  year: { type: String, required: true, unique: true },
}, { timestamps: true }); // Important: adds createdAt field

yearSchema.statics.getLastCreatedYear = async function () {
  try {
    const lastYear = await this.findOne().sort({ createdAt: -1 });
    return lastYear;
  } catch (error) {
    throw error;
  }
};

const Year = mongoose.model("Year", yearSchema);

export default Year;
