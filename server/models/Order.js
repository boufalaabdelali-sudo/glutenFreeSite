const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    /** Ancien format (key) — conservé pour compatibilité lecture */
    key: { type: String },
    label: { type: String, required: true },
    qty: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderCode: { type: String, required: true, unique: true, index: true },
    customer: { type: customerSchema, required: true },
    items: { type: [itemSchema], required: true },
    total: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ["livraison", "enligne"],
      required: true,
    },
    deliveryDate: { type: String, required: true },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["nouvelle", "confirmee", "livree", "annulee"],
      default: "nouvelle",
    },
  },
  { timestamps: true }
);

function toFrontendOrder(doc) {
  const o = doc && typeof doc.toObject === "function" ? doc.toObject() : doc;
  const created = o.createdAt;
  const createdAt =
    created instanceof Date
      ? created.toISOString()
      : created
        ? new Date(created).toISOString()
        : new Date().toISOString();
  const items = (o.items || []).map((it) => ({
    productId: it.productId ? String(it.productId) : "",
    key: it.key || "",
    label: it.label,
    qty: it.qty,
    unitPrice: it.unitPrice,
  }));
  return {
    id: o.orderCode,
    _id: String(o._id),
    createdAt,
    status: o.status,
    customer: o.customer,
    items,
    total: o.total,
    paymentMethod: o.paymentMethod,
    deliveryDate: o.deliveryDate,
    notes: o.notes || "",
  };
}

module.exports = {
  Order: mongoose.model("Order", orderSchema),
  toFrontendOrder,
};
