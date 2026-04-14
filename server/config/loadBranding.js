const fs = require("fs");
const path = require("path");

function deepMerge(base, override) {
  if (!override || typeof override !== "object") return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const key of Object.keys(override)) {
    const v = override[key];
    if (v && typeof v === "object" && !Array.isArray(v) && typeof out[key] === "object" && out[key] && !Array.isArray(out[key])) {
      out[key] = deepMerge(out[key], v);
    } else {
      out[key] = v;
    }
  }
  return out;
}

function loadJsonSafe(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8");
  // Some editors (or PowerShell) may write UTF-8 with BOM.
  const sanitized = raw.replace(/^\uFEFF/, "").trim();
  return JSON.parse(sanitized);
}

/**
 * Charge la marque client : BRANDING_PATH ou config/branding.json,
 * complete avec config/branding.default.json pour les cles manquantes.
 */
function loadBranding() {
  const projectRoot = path.join(__dirname, "..", "..");
  const defaultPath = path.join(projectRoot, "config", "branding.default.json");
  const envPath = process.env.BRANDING_PATH
    ? path.isAbsolute(process.env.BRANDING_PATH)
      ? process.env.BRANDING_PATH
      : path.join(projectRoot, process.env.BRANDING_PATH)
    : path.join(projectRoot, "config", "branding.json");

  const defaults = loadJsonSafe(defaultPath) || {};
  const stripMeta = (obj) => {
    if (!obj || typeof obj !== "object") return obj;
    const { $schema, ...rest } = obj;
    return rest;
  };
  const base = stripMeta(defaults);

  const custom = loadJsonSafe(envPath);
  const merged = custom ? deepMerge(base, stripMeta(custom)) : base;

  if (!merged.siteName) merged.siteName = "Commerce";

  return merged;
}

module.exports = { loadBranding, deepMerge };
