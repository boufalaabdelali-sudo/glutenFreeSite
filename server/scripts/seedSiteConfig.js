require("dotenv").config();
const mongoose = require("mongoose");
const { SiteConfig } = require("../models/SiteConfig");
const { loadBranding } = require("../config/loadBranding");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sans_gluten_express";

async function main() {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  const existing = await SiteConfig.findOne();
  if (existing) {
    console.log("[seed:site-config] Configuration déjà présente. Rien à faire.");
    await mongoose.disconnect();
    return;
  }
  const initial = loadBranding();
  await SiteConfig.create(initial);
  console.log("[seed:site-config] Configuration créée depuis branding JSON.");
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
