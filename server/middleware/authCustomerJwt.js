const jwt = require("jsonwebtoken");

function getJwtSecret() {
  return process.env.JWT_SECRET || "dev-only-change-me";
}

function requireCustomerAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Connexion client requise." });
  }
  const token = auth.slice(7);
  try {
    req.customer = jwt.verify(token, getJwtSecret());
    if (req.customer.type !== "customer") {
      return res.status(401).json({ error: "Session client invalide." });
    }
    return next();
  } catch {
    return res.status(401).json({ error: "Session client invalide ou expiree." });
  }
}

module.exports = { requireCustomerAuth };
