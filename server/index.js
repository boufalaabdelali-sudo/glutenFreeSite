require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRouter = require("./routes/auth");
const brandingRouter = require("./routes/branding");
const adminUsersRouter = require("./routes/adminUsers");
const productsRouter = require("./routes/products");
const ordersRouter = require("./routes/orders");
const { ensureUploadDir } = require("./utils/uploadProduct");

const PORT = Number(process.env.PORT) || 3000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sans_gluten_express";

const app = express();
app.use(cors());
app.use(express.json({ limit: "64kb" }));

ensureUploadDir();

app.use("/api/auth", authRouter);
app.use("/api/branding", brandingRouter);
app.use("/api/admin-users", adminUsersRouter);
app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);

const publicDir = path.join(__dirname, "..");
app.use(express.static(publicDir));

app.use((err, _req, res, next) => {
  if (err && err.message === "Format image non supporte (JPEG, PNG, WebP, GIF).") {
    return res.status(400).json({ error: err.message });
  }
  if (err && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "Fichier trop volumineux (max 3 Mo)." });
  }
  next(err);
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Erreur serveur." });
});

async function main() {
  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 8000,
  });
  console.log("[mongo] Connecte:", MONGODB_URI.replace(/\/\/.*@/, "//***@"));

  if (!process.env.JWT_SECRET) {
    console.warn("[auth] JWT_SECRET non defini — utilisez une cle forte en production.");
  }

  app.listen(PORT, () => {
    console.log(`[serveur] http://localhost:${PORT}`);
    console.log("[info] Premier compte admin: npm run seed:admin");
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
