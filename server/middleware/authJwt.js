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

function requireRole(allowedRoles) {
  const list = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ error: "Session invalide." });
    }
    if (!list.includes(req.admin.role)) {
      return res.status(403).json({ error: "Droits insuffisants." });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole, getJwtSecret };
