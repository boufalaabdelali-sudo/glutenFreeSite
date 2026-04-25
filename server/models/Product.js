const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, default: "Général", trim: true },
    description: { type: String, default: "", trim: true },
    price: { type: Number, required: true, min: 0 },
    /** Chemin URL servi en statique, ex: /uploads/products/abc.jpg */
    imagePath: { type: String, default: "" },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

function toPublicProduct(doc) {
  const o = doc && typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    _id: String(o._id),
    name: o.name,
    category: o.category || "Général",
    description: o.description || "",
    price: o.price,
    imageUrl: o.imagePath ? o.imagePath : "",
    active: o.active,
    sortOrder: o.sortOrder ?? 0,
  };
}

module.exports = {
  Product: mongoose.model("Product", productSchema),
  toPublicProduct,
};
