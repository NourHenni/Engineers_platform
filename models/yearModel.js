import mongoose from "mongoose";

const yearSchema = new mongoose.Schema({
  year: { type: String, required: true, unique: true },
});

export default mongoose.model("Year", yearSchema);
