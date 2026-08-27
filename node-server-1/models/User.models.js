const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,  // Corrected from 'require' to 'required'
    },
    email: {
        type: String,
        required: true,  // Corrected from 'require' to 'required'
        unique: true,    // Ensures the email is unique
    },
    password: {
        type: String,
        required: true,  // Corrected from 'require' to 'required'
    },
    isVerified: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
