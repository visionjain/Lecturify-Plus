import mongoose from "mongoose";

const LectureSchema = new mongoose.Schema({
  topic: {
    type: String,
    required: [true, "Please provide a lecture topic"],
  },
  transcript: {
    type: String, // This will store the transcript as a string
    default: null, // Default value if no transcript is provided
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  notes: {
    type: String, // Stores the generated notes code in React/HTML/Tailwind
    default: null,
  },
  qwiz: {
    type: String, // Stores the generated quiz (qwiz) code
    default: null,
  },
  flashcards: {
    type: String, // Stores the generated flashcards code
    default: null,
  },
  cheatSheet: {
    type: String, // Stores the generated cheat sheet code
    default: null,
  },
});

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "please provide name"],
  },
  email: {
    type: String,
    required: [true, "please provide email"],
    unique: true,
  },
  phoneNumber: {
    type: String,
    required: [true, "please provide phone number"],
  },
  password: {
    type: String,
    required: [true, "please provide password"],
  },
  role: {
    type: String,
    enum: ["user", "turf", "admin"],
    default: "user",
  },
  dateOfBirth: {
    type: String,
    default: null,
  },
  gender: {
    type: String,
    enum: ["male", "female", "others"],
    default: null,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  forgotPasswordToken: String,
  forgotPasswordTokenExpiry: Date,
  verifyToken: String,
  verifyTokenExpiry: Date,

  // Lectures field
  lectures: [LectureSchema],
});

const User = mongoose.models.users || mongoose.model("users", UserSchema);

export default User;
