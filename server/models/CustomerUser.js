const mongoose = require("mongoose");

const customerUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    active: { type: Boolean, default: true },
    /** Coordonnées livraison / contact (réutilisées pour les commandes) */
    fullName: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

module.exports = {
  CustomerUser: mongoose.model("CustomerUser", customerUserSchema),
};
