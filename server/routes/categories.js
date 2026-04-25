const express = require("express");
const mongoose = require("mongoose");
const { Category, toPublicCategory } = require("../models/Category");
const { Product } = require("../models/Product");
const { requireAuth, requireRole } = require("../middleware/authJwt");

const router = express.Router();

function parseSortOrder(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** GET /api/categories — liste */
router.get("/", async (_req, res) => {
  try {
    const count = await Category.countDocuments();
    if (count === 0) {
      await Category.create({ name: "Général" });
    }
    const docs = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();
    res.json({ categories: docs.map((d) => toPublicCategory(d)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de charger les catégories." });
  }
});

/** POST /api/categories — créer (admin) */
router.post("/", requireAuth, requireRole(["owner", "manager", "editor"]), async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const sortOrder = parseSortOrder(req.body?.sortOrder, 0);
    if (!name) {
      return res.status(400).json({ error: "Nom de catégorie requis." });
    }
    const exists = await Category.findOne({ name }).lean();
    if (exists) {
      return res.status(409).json({ error: "Cette catégorie existe déjà." });
    }
    const category = await Category.create({ name, sortOrder });
    return res.status(201).json({ category: toPublicCategory(category) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Création de catégorie impossible." });
  }
});

/** PATCH /api/categories/:id — mise à jour (admin) */
router.patch("/:id", requireAuth, requireRole(["owner", "manager", "editor"]), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Identifiant invalide." });
    }
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ error: "Catégorie introuvable." });
    }

    if (req.body?.name != null) {
      const nextName = String(req.body.name).trim();
      if (!nextName) {
        return res.status(400).json({ error: "Nom de catégorie requis." });
      }
      const duplicate = await Category.findOne({ name: nextName, _id: { $ne: id } }).lean();
      if (duplicate) {
        return res.status(409).json({ error: "Cette catégorie existe déjà." });
      }
      const usedCount = await Product.countDocuments({ category: category.name });
      if (usedCount > 0 && nextName !== category.name) {
        await Product.updateMany({ category: category.name }, { $set: { category: nextName } });
      }
      category.name = nextName;
    }
    if (req.body?.sortOrder != null) {
      category.sortOrder = parseSortOrder(req.body.sortOrder, category.sortOrder || 0);
    }

    await category.save();
    return res.json({ category: toPublicCategory(category) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Mise à jour de catégorie impossible." });
  }
});

/** DELETE /api/categories/:id — supprimer (admin) */
router.delete("/:id", requireAuth, requireRole(["owner", "manager"]), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Identifiant invalide." });
    }
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ error: "Catégorie introuvable." });
    }
    const used = await Product.countDocuments({ category: category.name });
    if (used > 0) {
      return res.status(400).json({ error: "Catégorie utilisée par des produits." });
    }
    await Category.findByIdAndDelete(id);
    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Suppression de catégorie impossible." });
  }
});

module.exports = router;
