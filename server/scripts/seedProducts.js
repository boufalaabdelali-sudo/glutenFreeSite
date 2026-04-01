/**
 * Insere des plats exemple si la collection est vide (sans photos).
 * Usage: npm run seed:products
 */
require("dotenv").config();
const mongoose = require("mongoose");
const { Product } = require("../models/Product");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sans_gluten_express";

const samples = [
  { name: "Bowl quinoa mediterraneen", description: "Legumes, feta, olives.", price: 11.5, sortOrder: 10 },
  { name: "Pates riz & pesto maison", description: "Pesto basilic, tomates cerises.", price: 10, sortOrder: 20 },
  { name: "Wrap mais poulet grille", description: "Crudites, yaourt citronne.", price: 9.5, sortOrder: 30 },
  { name: "Dessert fondant chocolat", description: "Chocolat noir 70%.", price: 4.5, sortOrder: 40 },
];

async function main() {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  const n = await Product.countDocuments();
  if (n > 0) {
    console.log(`[seed:products] ${n} produit(s) deja presents. Rien a faire.`);
    await mongoose.disconnect();
    return;
  }
  await Product.insertMany(
    samples.map((s) => ({
      ...s,
      active: true,
      imagePath: "",
    }))
  );
  console.log(`[seed:products] ${samples.length} plats exemples crees. Ajoutez des photos depuis l'admin.`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
