const express = require("express");
const { requireAuth, requireRole } = require("../middleware/authJwt");
const { toPublicConfig } = require("../models/SiteConfig");
const {
  getOrCreateSiteConfig,
  updateSiteConfig,
} = require("../services/siteConfigService");
const { upload, filePathToUrl } = require("../utils/uploadProduct");

const router = express.Router();

function setNoStore(res) {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
}

/** GET /api/branding — public */
router.get("/", async (_req, res) => {
  try {
    setNoStore(res);
    const cfg = await getOrCreateSiteConfig();
    res.json(toPublicConfig(cfg));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Configuration marque indisponible." });
  }
});

/** GET /api/branding/admin — complet (admin) */
router.get(
  "/admin",
  requireAuth,
  requireRole(["owner", "manager", "editor"]),
  async (_req, res) => {
  try {
    setNoStore(res);
    const cfg = await getOrCreateSiteConfig();
    res.json({ config: toPublicConfig(cfg) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Lecture de configuration impossible." });
  }
  }
);

/** PUT /api/branding/admin — mise à jour partielle/fusion (admin) */
router.put("/admin", requireAuth, requireRole(["owner", "manager"]), async (req, res) => {
  try {
    setNoStore(res);
    const cfg = await updateSiteConfig(req.body || {});
    res.json({ config: toPublicConfig(cfg) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Mise à jour de configuration impossible." });
  }
});

/** POST /api/branding/upload — upload d'une image branding (admin) */
router.post(
  "/upload",
  requireAuth,
  requireRole(["owner", "manager"]),
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Fichier image requis." });
      }
      return res.status(201).json({ imageUrl: filePathToUrl(req.file.filename) });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Upload image impossible." });
    }
  }
);

module.exports = router;
