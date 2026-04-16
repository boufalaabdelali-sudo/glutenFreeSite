const express = require("express");
const mongoose = require("mongoose");
const { Order, toFrontendOrder } = require("../models/Order");
const { Product } = require("../models/Product");
const { requireAuth: requireAdminAuth, requireRole } = require("../middleware/authJwt");
const { requireCustomerAuth } = require("../middleware/authCustomerJwt");

const router = express.Router();

function generateOrderCode() {
  return `CMD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

async function normalizeItemsFromBody(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { error: "Au moins un plat est requis." };
  }
  const items = [];
  let total = 0;

  for (const row of rawItems) {
    const productId = row?.productId;
    const qty = Number(row?.qty);
    if (!productId || typeof productId !== "string" || !mongoose.isValidObjectId(productId)) {
      return { error: "Identifiant produit invalide." };
    }
    if (!Number.isFinite(qty) || qty < 1 || qty > 20) {
      return { error: "Quantite invalide." };
    }

    const product = await Product.findById(productId).lean();
    if (!product || !product.active) {
      return { error: "Un produit n'est plus disponible. Rafraichissez la page." };
    }

    const unitPrice = product.price;
    items.push({
      productId: product._id,
      label: product.name,
      qty,
      unitPrice,
    });
    total += qty * unitPrice;
  }

  return { items, total };
}

/** POST /api/orders — creation (client connecté) */
router.post("/", requireCustomerAuth, async (req, res) => {
  try {
    const { customer, items: rawItems, paymentMethod, deliveryDate, notes } = req.body;

    if (
      !customer?.name ||
      !customer?.phone ||
      !customer?.address
    ) {
      return res.status(400).json({ error: "Coordonnees client incompletes." });
    }
    if (!["livraison", "enligne"].includes(paymentMethod)) {
      return res.status(400).json({ error: "Mode de paiement invalide." });
    }
    if (!deliveryDate || typeof deliveryDate !== "string") {
      return res.status(400).json({ error: "Date de livraison requise." });
    }

    const normalized = await normalizeItemsFromBody(rawItems);
    if (normalized.error) {
      return res.status(400).json({ error: normalized.error });
    }

    const order = await Order.create({
      orderCode: generateOrderCode(),
      customerUserId: req.customer.sub,
      customer: {
        name: String(customer.name).trim(),
        phone: String(customer.phone).trim(),
        email: String(req.customer.email || customer.email || "").trim().toLowerCase(),
        address: String(customer.address).trim(),
      },
      items: normalized.items,
      total: normalized.total,
      paymentMethod,
      deliveryDate: String(deliveryDate).trim(),
      notes: notes != null ? String(notes) : "",
      status: "nouvelle",
    });

    res.status(201).json({ order: toFrontendOrder(order) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Conflit de reference commande, reessayez." });
    }
    console.error(err);
    res.status(500).json({ error: "Erreur serveur lors de la creation de la commande." });
  }
});

/** GET /api/orders — liste (admin JWT) */
router.get("/", requireAdminAuth, async (_req, res) => {
  try {
    const docs = await Order.find().sort({ createdAt: -1 }).lean();
    const orders = docs.map((d) => toFrontendOrder(d));
    res.json({ orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Impossible de charger les commandes." });
  }
});

/** GET /api/orders/my — suivi client connecté */
router.get("/my", requireCustomerAuth, async (req, res) => {
  try {
    const docs = await Order.find({ customerUserId: req.customer.sub }).sort({ createdAt: -1 }).lean();
    const orders = docs.map((d) => toFrontendOrder(d));
    return res.json({ orders });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Impossible de charger vos commandes." });
  }
});

/** DELETE /api/orders — toutes (admin) — avant /:id */
router.delete("/", requireAdminAuth, requireRole(["owner", "manager"]), async (_req, res) => {
  try {
    await Order.deleteMany({});
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Suppression globale impossible." });
  }
});

/** PATCH /api/orders/:id — statut (admin) */
router.patch(
  "/:id",
  requireAdminAuth,
  requireRole(["owner", "manager", "editor"]),
  async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ["nouvelle", "confirmee", "livree", "annulee"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Statut invalide." });
    }
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Identifiant invalide." });
    }
    const order = await Order.findByIdAndUpdate(id, { status }, { new: true });
    if (!order) {
      return res.status(404).json({ error: "Commande introuvable." });
    }
    res.json({ order: toFrontendOrder(order) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Mise a jour impossible." });
  }
  }
);

/** DELETE /api/orders/:id — (admin) */
router.delete("/:id", requireAdminAuth, requireRole(["owner", "manager"]), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Identifiant invalide." });
    }
    const deleted = await Order.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: "Commande introuvable." });
    }
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Suppression impossible." });
  }
});

module.exports = router;
