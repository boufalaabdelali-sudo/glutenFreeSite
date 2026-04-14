const API_BASE = "";

/** Configuration affichage (API /api/branding) */
let branding = null;

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

function getBrandingContact() {
  return branding?.contact || {};
}

function normalizeBrandingUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const fixed = raw.replaceAll("\\", "/");
  if (/^[a-zA-Z]:\//.test(fixed)) {
    const parts = fixed.split("/");
    return `/assets/branding/${parts[parts.length - 1]}`;
  }
  if (fixed.startsWith("http://") || fixed.startsWith("https://") || fixed.startsWith("/")) {
    return fixed;
  }
  return `/${fixed.replace(/^\/+/, "")}`;
}

function formatMoney(value) {
  const loc = branding?.locale || "fr-FR";
  const cur = branding?.currency || "EUR";
  return value.toLocaleString(loc, { style: "currency", currency: cur });
}

function applyBrandingToDom(b) {
  const t = b.texts || {};
  const labels = b.labels || {};
  const theme = b.theme || {};
  const images = b.images || {};
  const root = document.documentElement;
  const year = new Date().getFullYear();

  if (theme.primary) root.style.setProperty("--primary", theme.primary);
  if (theme.primaryDark) root.style.setProperty("--primary-dark", theme.primaryDark);
  else if (theme.primary) root.style.setProperty("--primary-dark", theme.primary);
  if (theme.heroGradient) {
    root.style.setProperty("--hero-bg", `linear-gradient(${theme.heroGradient})`);
  }
  if (theme.badgeBg) {
    root.style.setProperty("--badge-bg", theme.badgeBg);
  }

  const hero = document.getElementById("br-hero");
  const heroBackgroundUrl = normalizeBrandingUrl(images.heroBackground);
  if (hero && heroBackgroundUrl) {
    hero.style.backgroundImage = `linear-gradient(rgba(15, 23, 42, 0.55), rgba(15, 23, 42, 0.4)), url(${heroBackgroundUrl})`;
    hero.style.backgroundSize = "cover";
    hero.style.backgroundPosition = "center";
  }

  const meta = document.getElementById("br-meta-desc");
  if (meta && t.metaDescription) meta.setAttribute("content", t.metaDescription);

  const titleSuffix = t.pageTitleSuffix || "Commande";
  document.title = `${b.siteName || "Commerce"} — ${titleSuffix}`;

  const faviconUrl = normalizeBrandingUrl(images.favicon);
  if (faviconUrl) {
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = faviconUrl;
    document.head.appendChild(link);
  }

  const logoEl = document.getElementById("br-logo");
  const logoUrl = normalizeBrandingUrl(images.logo);
  if (logoEl && logoUrl) {
    logoEl.src = logoUrl;
    logoEl.classList.remove("hidden");
    logoEl.alt = b.siteName || "";
    logoEl.onerror = () => {
      logoEl.classList.add("hidden");
    };
  }

  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el && text != null) el.textContent = text;
  };

  setText("br-site-name", b.siteName);
  setText("br-nav-command", t.navCtaCommand);
  setText("br-nav-admin", t.navCtaAdmin);
  setText("br-hero-badge", t.heroBadge);
  setText("br-hero-title", t.heroTitle);
  setText("br-hero-lead", t.heroLead);
  setText("br-menu-title", t.menuSectionTitle);
  if (menuLoading && t.menuLoading) menuLoading.textContent = t.menuLoading;
  if (menuEmpty && t.menuEmpty) menuEmpty.textContent = t.menuEmpty;
  setText("br-order-title", t.orderSectionTitle);
  if (orderBlocked && t.orderBlocked) orderBlocked.textContent = t.orderBlocked;
  const leg = document.getElementById("br-fieldset-legend");
  if (leg) {
    leg.textContent = labels.selectItemsLegend || t.fieldsetLegend || "Sélection";
  }
  const notes = document.getElementById("br-notes");
  if (notes && t.notesPlaceholder) notes.placeholder = t.notesPlaceholder;
  const footer = document.getElementById("br-footer");
  if (footer) {
    const copy = t.footerCopyright || b.siteName || "";
    footer.textContent = `© ${year} ${copy}`;
  }
  if (submitBtn && t.confirmButton) submitBtn.textContent = t.confirmButton;
}

async function loadBranding() {
  try {
    const res = await fetch(`${API_BASE}/api/branding`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error();
    branding = data;
    applyBrandingToDom(data);
  } catch {
    branding = {
      siteName: "Commerce",
      locale: "fr-FR",
      currency: "EUR",
      contact: { whatsapp: "33600000000", email: "contact@exemple.fr", stripePaymentLink: "" },
      texts: {},
    };
  }
}

function toEuro(value) {
  return formatMoney(value);
}

function calculateTotal() {
  if (!form || !menuProducts.length) {
    if (totalText) totalText.textContent = `Total: ${formatMoney(0)}`;
    return 0;
  }
  const data = new FormData(form);
  let total = 0;
  menuProducts.forEach((p) => {
    total += (Number(data.get(`qty-${p._id}`)) || 0) * p.price;
  });
  totalText.textContent = `Total: ${formatMoney(total)}`;
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
    `Total: ${formatMoney(order.total)}`,
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
        <p class="price">${formatMoney(p.price)}</p>
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

  const loadingText = branding?.texts?.menuLoading || "Chargement...";
  menuLoading.textContent = loadingText;

  try {
    const res = await fetch(`${API_BASE}/api/products/menu`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Erreur menu");
    menuProducts = data.products || [];
  } catch {
    menuProducts = [];
    menuLoading.textContent =
      "Impossible de charger le catalogue. Verifiez que le serveur tourne (npm start).";
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
    confirmation.textContent = "Veuillez selectionner au moins un article.";
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

  const sending = branding?.texts?.confirmSending || "Envoi en cours...";
  const confirmLabel = branding?.texts?.confirmButton || "Valider la commande";

  submitBtn.disabled = true;
  submitBtn.textContent = sending;
  confirmation.classList.add("hidden");

  const contact = getBrandingContact();
  const wa = String(contact.whatsapp || "33600000000").replace(/\D/g, "");
  const email = contact.email || "contact@exemple.fr";
  const stripeLink = contact.stripePaymentLink || "";

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
    const whatsappUrl = `https://wa.me/${wa}?text=${encodeURIComponent(text)}`;
    const emailUrl = `mailto:${email}?subject=${encodeURIComponent(`Commande ${order.id}`)}&body=${encodeURIComponent(text)}`;

    confirmation.classList.remove("hidden");
    confirmation.innerHTML = `
      <strong>Commande enregistree (${order.id})</strong><br />
      Merci ${order.customer.name}, nous vous contactons rapidement.
      <div class="links">
        <a class="btn btn-secondary" href="${whatsappUrl}" target="_blank" rel="noreferrer">WhatsApp</a>
        <a class="btn btn-secondary" href="${emailUrl}">Email</a>
        ${order.paymentMethod === "enligne" && stripeLink ? `<a class="btn btn-primary" href="${escapeAttr(stripeLink)}" target="_blank" rel="noreferrer">Payer en ligne</a>` : ""}
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
    submitBtn.textContent = confirmLabel;
  }
});

async function bootstrap() {
  await loadBranding();
  await initMenu();
}

bootstrap();
