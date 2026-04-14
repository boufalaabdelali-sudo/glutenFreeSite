const express = require("express");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { AdminUser } = require("../models/AdminUser");
const { requireAuth, requireRole } = require("../middleware/authJwt");

const router = express.Router();

router.use(requireAuth, requireRole("owner"));

router.get("/", async (_req, res) => {
  try {
    const users = await AdminUser.find().sort({ createdAt: 1 }).lean();
    res.json({
      users: users.map((u) => ({
        id: String(u._id),
        username: u.username,
        role: u.role || "owner",
        active: !!u.active,
        createdAt: u.createdAt,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de charger les comptes admin." });
  }
});

router.post("/", async (req, res) => {
  try {
    const username = String(req.body?.username || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const role = String(req.body?.role || "editor");
    if (!username || !password) {
      return res.status(400).json({ error: "Identifiant et mot de passe requis." });
    }
    if (!["owner", "manager", "editor"].includes(role)) {
      return res.status(400).json({ error: "Rôle invalide." });
    }
    const exists = await AdminUser.findOne({ username });
    if (exists) {
      return res.status(409).json({ error: "Ce compte existe déjà." });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const created = await AdminUser.create({
      username,
      passwordHash,
      role,
      active: true,
    });
    res.status(201).json({
      user: {
        id: String(created._id),
        username: created.username,
        role: created.role,
        active: created.active,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Création du compte admin impossible." });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Identifiant invalide." });
    }
    const user = await AdminUser.findById(id);
    if (!user) {
      return res.status(404).json({ error: "Compte introuvable." });
    }
    if (req.body.role != null) {
      const role = String(req.body.role);
      if (!["owner", "manager", "editor"].includes(role)) {
        return res.status(400).json({ error: "Rôle invalide." });
      }
      user.role = role;
    }
    if (req.body.active != null) {
      user.active = !!req.body.active;
    }
    if (req.body.password != null && String(req.body.password)) {
      user.passwordHash = await bcrypt.hash(String(req.body.password), 10);
    }
    await user.save();
    res.json({
      user: {
        id: String(user._id),
        username: user.username,
        role: user.role,
        active: user.active,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Mise à jour du compte impossible." });
  }
});

module.exports = router;
