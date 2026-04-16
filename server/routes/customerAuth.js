const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { CustomerUser } = require("../models/CustomerUser");
const { requireCustomerAuth } = require("../middleware/authCustomerJwt");
const { getJwtSecret } = require("../middleware/authJwt");

const router = express.Router();

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
    if (!email || !password) {
      return res.status(400).json({ error: "Email et mot de passe requis." });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caracteres." });
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
    const user = await CustomerUser.create({ email, passwordHash, active: true });
    const signed = signCustomer(user);
    return res.status(201).json({
      token: signed.token,
      expiresIn: signed.expiresIn,
      user: { id: String(user._id), email: user.email },
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
      user: { id: String(user._id), email: user.email },
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
    return res.json({ user: { id: String(user._id), email: user.email } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Impossible de charger la session client." });
  }
});

module.exports = router;
