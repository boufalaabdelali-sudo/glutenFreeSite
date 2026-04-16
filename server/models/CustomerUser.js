const mongoose = require("mongoose");

const customerUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = {
  CustomerUser: mongoose.model("CustomerUser", customerUserSchema),
};
