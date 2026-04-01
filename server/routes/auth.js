const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { AdminUser } = require("../models/AdminUser");
const { getJwtSecret } = require("../middleware/authJwt");

const router = express.Router();

/** POST /api/auth/login */
router.post("/login", async (req, res) => {
  try {
    const username = String(req.body?.username || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!username || !password) {
      return res.status(400).json({ error: "Identifiant et mot de passe requis." });
    }

    const user = await AdminUser.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: "Identifiants incorrects." });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Identifiants incorrects." });
    }

    const expiresIn = "7d";
    const token = jwt.sign(
      { sub: String(user._id), username: user.username },
      getJwtSecret(),
      { expiresIn }
    );

    res.json({
      token,
      expiresIn,
      user: { username: user.username },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur lors de la connexion." });
  }
});

module.exports = router;
