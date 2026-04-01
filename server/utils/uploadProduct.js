const fs = require("fs");
const path = require("path");
const multer = require("multer");

/** Racine du projet (parent de server/) */
const projectRoot = path.join(__dirname, "..", "..");
const uploadDir = path.join(projectRoot, "uploads", "products");

function ensureUploadDir() {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadDir();
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    cb(null, safe);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype);
    cb(ok ? null : new Error("Format image non supporte (JPEG, PNG, WebP, GIF)."), ok);
  },
});

function filePathToUrl(filename) {
  return `/uploads/products/${filename}`;
}

function urlToAbsoluteFsPath(imageUrl) {
  if (!imageUrl || typeof imageUrl !== "string") return null;
  const rel = imageUrl.replace(/^\//, "");
  return path.join(projectRoot, rel);
}

function deleteImageFileIfExists(imageUrl) {
  const abs = urlToAbsoluteFsPath(imageUrl);
  if (!abs || !abs.includes(`${path.sep}uploads${path.sep}products`)) return;
  fs.unlink(abs, () => {});
}

module.exports = {
  upload,
  uploadDir,
  ensureUploadDir,
  filePathToUrl,
  deleteImageFileIfExists,
};
