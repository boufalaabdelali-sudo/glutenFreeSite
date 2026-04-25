const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { CustomerUser } = require("../models/CustomerUser");
const { requireCustomerAuth } = require("../middleware/authCustomerJwt");
const { getJwtSecret } = require("../middleware/authJwt");

const router = express.Router();

function trimProfile(body) {
  return {
    fullName: String(body?.fullName ?? "").trim(),
    phone: String(body?.phone ?? "").trim(),
    address: String(body?.address ?? "").trim(),
  };
}

function validateProfileRequired(p) {
  if (p.fullName.length < 2) return "Nom complet requis (2 caractères minimum).";
  if (p.phone.length < 6) return "Téléphone requis (6 caractères minimum).";
  if (p.address.length < 5) return "Adresse requise (5 caractères minimum).";
  return null;
}

function toPublicUser(doc) {
  const u = doc && typeof doc.toObject === "function" ? doc.toObject() : doc;
  if (!u) return null;
  return {
    id: String(u._id),
    email: u.email,
    fullName: u.fullName || "",
    phone: u.phone || "",
    address: u.address || "",
  };
}

function signCustomer(user) {
  const expiresIn = "7d";
  const token = jwt.sign(
    { sub: String(user._id), email: user.email, type: "customer" },
    getJwtSecret(),
    { expiresIn }
  );
  return { token, expiresIn };
}

router.post("/register", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const profile = trimProfile(req.body);
    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis." });
    }
    const profileErr = validateProfileRequired(profile);
    if (profileErr) {
      return res.status(400).json({ error: profileErr });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caractères." });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Email invalide." });
    }
    const exists = await CustomerUser.findOne({ email }).lean();
    if (exists) {
      return res.status(409).json({ error: "Un compte existe deja pour cet email." });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await CustomerUser.create({
      email,
      passwordHash,
      active: true,
      fullName: profile.fullName,
      phone: profile.phone,
      address: profile.address,
    });
    const signed = signCustomer(user);
    return res.status(201).json({
      token: signed.token,
      expiresIn: signed.expiresIn,
      user: toPublicUser(user),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erreur serveur lors de l'inscription." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis." });
    }
    const user = await CustomerUser.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Identifiants incorrects." });
    }
    if (!user.active) {
      return res.status(403).json({ error: "Compte client desactive." });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Identifiants incorrects." });
    }
    const signed = signCustomer(user);
    return res.json({
      token: signed.token,
      expiresIn: signed.expiresIn,
      user: toPublicUser(user),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erreur serveur lors de la connexion." });
  }
});

router.get("/me", requireCustomerAuth, async (req, res) => {
  try {
    const user = await CustomerUser.findById(req.customer.sub).lean();
    if (!user || !user.active) {
      return res.status(401).json({ error: "Session client invalide." });
    }
    return res.json({ user: toPublicUser(user) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Impossible de charger la session client." });
  }
});

/** Mise à jour du profil (coordonnées pour les commandes) */
router.patch("/profile", requireCustomerAuth, async (req, res) => {
  try {
    const profile = trimProfile(req.body);
    const err = validateProfileRequired(profile);
    if (err) {
      return res.status(400).json({ error: err });
    }
    const user = await CustomerUser.findById(req.customer.sub);
    if (!user || !user.active) {
      return res.status(401).json({ error: "Session client invalide." });
    }
    user.fullName = profile.fullName;
    user.phone = profile.phone;
    user.address = profile.address;
    await user.save();
    return res.json({ user: toPublicUser(user) });
  } catch (e) {
    console.error(e);
      return res.status(500).json({ error: "Impossible de mettre à jour le profil." });
  }
});

module.exports = router;
