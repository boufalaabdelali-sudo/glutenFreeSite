const jwt = require("jsonwebtoken");

function getJwtSecret() {
  return process.env.JWT_SECRET || "dev-only-change-me";
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Connexion requise (token manquant)." });
  }
  const token = auth.slice(7);
  try {
    req.admin = jwt.verify(token, getJwtSecret());
    return next();
  } catch {
    return res.status(401).json({ error: "Session invalide ou expiree. Reconnectez-vous." });
  }
}

module.exports = { requireAuth, getJwtSecret };
