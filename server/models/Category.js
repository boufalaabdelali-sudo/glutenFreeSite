const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

function toPublicCategory(doc) {
  const o = doc && typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    _id: String(o._id),
    name: o.name,
    sortOrder: Number.isFinite(o.sortOrder) ? o.sortOrder : 0,
  };
}

module.exports = {
  Category: mongoose.model("Category", categorySchema),
  toPublicCategory,
};
