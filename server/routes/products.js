const express = require("express");
const mongoose = require("mongoose");
const { Product, toPublicProduct } = require("../models/Product");
const { requireAuth, requireRole } = require("../middleware/authJwt");
const { upload, filePathToUrl, deleteImageFileIfExists } = require("../utils/uploadProduct");

const router = express.Router();

function parseBool(v, defaultVal = true) {
  if (v === undefined || v === null || v === "") return defaultVal;
  if (typeof v === "boolean") return v;
  const s = String(v).toLowerCase();
  if (s === "true" || s === "1") return true;
  if (s === "false" || s === "0") return false;
  return defaultVal;
}

function parseNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** GET /api/products/menu — vitrine (actifs uniquement) */
router.get("/menu", async (_req, res) => {
  try {
    const docs = await Product.find({ active: true }).sort({ sortOrder: 1, name: 1 }).lean();
    res.json({ products: docs.map((d) => toPublicProduct(d)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de charger le menu." });
  }
});

/** GET /api/products — tous (admin) */
router.get("/", requireAuth, async (_req, res) => {
  try {
    const docs = await Product.find().sort({ sortOrder: 1, name: 1 }).lean();
    res.json({ products: docs.map((d) => toPublicProduct(d)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de charger les produits." });
  }
});

/** POST /api/products — creer (admin) */
router.post(
  "/",
  requireAuth,
  requireRole(["owner", "manager", "editor"]),
  upload.single("image"),
  async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const description = String(req.body?.description || "").trim();
    const price = parseNumber(req.body?.price, NaN);
    const active = parseBool(req.body?.active, true);
    const sortOrder = parseNumber(req.body?.sortOrder, 0);

    if (!name) {
      return res.status(400).json({ error: "Nom du produit requis." });
    }
    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({ error: "Prix invalide." });
    }

    let imagePath = "";
    if (req.file) {
      imagePath = filePathToUrl(req.file.filename);
    }

    const product = await Product.create({
      name,
      description,
      price,
      imagePath,
      active,
      sortOrder,
    });

    res.status(201).json({ product: toPublicProduct(product) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Creation du produit impossible." });
  }
  }
);

/** PATCH /api/products/:id — mettre a jour (admin) */
router.patch(
  "/:id",
  requireAuth,
  requireRole(["owner", "manager", "editor"]),
  upload.single("image"),
  async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Identifiant invalide." });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: "Produit introuvable." });
    }

    if (req.body.name != null) product.name = String(req.body.name).trim();
    if (req.body.description != null) product.description = String(req.body.description).trim();
    if (req.body.price != null) {
      const price = parseNumber(req.body.price, NaN);
      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({ error: "Prix invalide." });
      }
      product.price = price;
    }
    if (req.body.active != null) product.active = parseBool(req.body.active, product.active);
    if (req.body.sortOrder != null) product.sortOrder = parseNumber(req.body.sortOrder, 0);

    if (req.file) {
      const oldUrl = product.imagePath;
      product.imagePath = filePathToUrl(req.file.filename);
      if (oldUrl) deleteImageFileIfExists(oldUrl);
    }

    await product.save();
    res.json({ product: toPublicProduct(product) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Mise a jour impossible." });
  }
  }
);

/** DELETE /api/products/:id — supprimer (admin) */
router.delete("/:id", requireAuth, requireRole(["owner", "manager"]), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Identifiant invalide." });
    }
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({ error: "Produit introuvable." });
    }
    if (product.imagePath) {
      deleteImageFileIfExists(product.imagePath);
    }
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Suppression impossible." });
  }
});

module.exports = router;
