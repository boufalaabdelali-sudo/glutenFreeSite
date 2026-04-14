const mongoose = require("mongoose");

const adminUserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["owner", "manager", "editor"],
      default: "owner",
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = {
  AdminUser: mongoose.model("AdminUser", adminUserSchema),
};
