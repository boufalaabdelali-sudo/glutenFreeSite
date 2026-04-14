require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { AdminUser } = require("../models/AdminUser");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sans_gluten_express";
const username = (process.env.ADMIN_SEED_USERNAME || "admin").trim().toLowerCase();
const password = process.env.ADMIN_SEED_PASSWORD || "changeme";
const role = (process.env.ADMIN_SEED_ROLE || "owner").trim().toLowerCase();

async function main() {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  const existing = await AdminUser.findOne({ username });
  if (existing) {
    console.log(`[seed] Compte "${username}" existe deja. Rien a faire.`);
    await mongoose.disconnect();
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await AdminUser.create({
    username,
    passwordHash,
    role: ["owner", "manager", "editor"].includes(role) ? role : "owner",
    active: true,
  });
  console.log(`[seed] Compte admin cree: ${username}`);
  console.log("[seed] Changez le mot de passe apres la premiere connexion (nouveau compte via seed avec autre mot de passe).");
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
