const API_BASE = "";
const WHATSAPP_NUMBER = "33600000000";
const BUSINESS_EMAIL = "commandes@sansgluten-express.fr";
const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/test_placeholder";

/** @type {Array<{_id: string, name: string, description: string, price: number, imageUrl: string}>} */
let menuProducts = [];

const form = document.getElementById("order-form");
const totalText = document.getElementById("total");
const confirmation = document.getElementById("confirmation");
const submitBtn = document.getElementById("submit-order");
const menuGrid = document.getElementById("menu-grid");
const menuLoading = document.getElementById("menu-loading");
const menuEmpty = document.getElementById("menu-empty");
const orderLines = document.getElementById("order-lines");
const orderBlocked = document.getElementById("order-blocked");

function toEuro(value) {
  return value.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function calculateTotal() {
  if (!form || !menuProducts.length) {
    if (totalText) totalText.textContent = "Total estime: 0,00 EUR";
    return 0;
  }
  const data = new FormData(form);
  let total = 0;
  menuProducts.forEach((p) => {
    const qty = Number(data.get(`qty-${p._id}`)) || 0;
    total += qty * p.price;
  });
  totalText.textContent = `Total estime: ${toEuro(total)}`;
  return total;
}

function buildOrderText(order) {
  const lines = order.items.map((item) => `- ${item.label} x${item.qty}`);
  return [
    `Commande ${order.id}`,
    `Client: ${order.customer.name}`,
    `Tel: ${order.customer.phone}`,
    `Email: ${order.customer.email}`,
    `Adresse: ${order.customer.address}`,
    `Date souhaitee: ${order.deliveryDate}`,
    `Paiement: ${order.paymentMethod}`,
    ...lines,
    `Total: ${toEuro(order.total)}`,
    `Notes: ${order.notes || "Aucune"}`,
  ].join("\n");
}

function renderMenu() {
  menuGrid.innerHTML = "";
  menuProducts.forEach((p) => {
    const article = document.createElement("article");
    article.className = "menu-item menu-item-card";
    const imgHtml = p.imageUrl
      ? `<div class="menu-item-media"><img src="${escapeAttr(p.imageUrl)}" alt="" loading="lazy" /></div>`
      : `<div class="menu-item-media menu-item-media--empty" aria-hidden="true"></div>`;
    article.innerHTML = `
      ${imgHtml}
      <div class="menu-item-body">
        <h3>${escapeHtml(p.name)}</h3>
        ${p.description ? `<p class="menu-desc">${escapeHtml(p.description)}</p>` : ""}
        <p class="price">${toEuro(p.price)}</p>
      </div>
    `;
    menuGrid.appendChild(article);
  });
}

function renderOrderFields() {
  orderLines.innerHTML = "";
  menuProducts.forEach((p) => {
    const label = document.createElement("label");
    label.className = "qty";
    label.innerHTML = `${escapeHtml(p.name)} <input type="number" min="0" max="20" value="0" name="qty-${p._id}" />`;
    orderLines.appendChild(label);
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function setDeliveryDateMin() {
  const input = form?.querySelector('[name="deliveryDate"]');
  if (!(input instanceof HTMLInputElement)) return;
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  input.min = `${y}-${m}-${d}`;
}

async function initMenu() {
  menuLoading.classList.remove("hidden");
  menuEmpty.classList.add("hidden");
  form.classList.add("hidden");
  orderBlocked.classList.add("hidden");

  try {
    const res = await fetch(`${API_BASE}/api/products/menu`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Erreur menu");
    menuProducts = data.products || [];
  } catch {
    menuProducts = [];
    menuLoading.textContent = "Impossible de charger le menu. Verifiez que le serveur tourne.";
    return;
  }

  menuLoading.classList.add("hidden");

  if (!menuProducts.length) {
    menuEmpty.classList.remove("hidden");
    orderBlocked.classList.remove("hidden");
    return;
  }

  renderMenu();
  renderOrderFields();
  form.classList.remove("hidden");
  setDeliveryDateMin();
  calculateTotal();
}

form.addEventListener("input", calculateTotal);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const itemsPayload = menuProducts
    .map((p) => ({
      productId: p._id,
      qty: Number(data.get(`qty-${p._id}`)) || 0,
    }))
    .filter((row) => row.qty > 0);

  if (!itemsPayload.length) {
    confirmation.classList.remove("hidden");
    confirmation.textContent = "Veuillez selectionner au moins un plat.";
    return;
  }

  const body = {
    customer: {
      name: String(data.get("name") || ""),
      phone: String(data.get("phone") || ""),
      email: String(data.get("email") || ""),
      address: String(data.get("address") || ""),
    },
    items: itemsPayload,
    paymentMethod: String(data.get("paymentMethod") || "livraison"),
    deliveryDate: String(data.get("deliveryDate") || ""),
    notes: String(data.get("notes") || ""),
  };

  submitBtn.disabled = true;
  submitBtn.textContent = "Envoi en cours...";
  confirmation.classList.add("hidden");

  try {
    const res = await fetch(`${API_BASE}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      confirmation.classList.remove("hidden");
      confirmation.textContent = payload.error || `Erreur serveur (${res.status}).`;
      return;
    }

    const order = payload.order;
    const text = buildOrderText(order);
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
    const emailUrl = `mailto:${BUSINESS_EMAIL}?subject=${encodeURIComponent(`Nouvelle commande ${order.id}`)}&body=${encodeURIComponent(text)}`;

    confirmation.classList.remove("hidden");
    confirmation.innerHTML = `
      <strong>Commande enregistree (${order.id})</strong><br />
      Merci ${order.customer.name}, nous vous contactons rapidement.
      <div class="links">
        <a class="btn btn-secondary" href="${whatsappUrl}" target="_blank" rel="noreferrer">Confirmer via WhatsApp</a>
        <a class="btn btn-secondary" href="${emailUrl}">Envoyer par email</a>
        ${order.paymentMethod === "enligne" ? `<a class="btn btn-primary" href="${STRIPE_PAYMENT_LINK}" target="_blank" rel="noreferrer">Payer en ligne</a>` : ""}
      </div>
    `;

    form.reset();
    renderOrderFields();
    setDeliveryDateMin();
    calculateTotal();
  } catch {
    confirmation.classList.remove("hidden");
    confirmation.textContent =
      "Impossible de joindre le serveur. Verifiez que l'API tourne (npm start) et que MongoDB est demarre.";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Confirmer la commande";
  }
});

initMenu();
