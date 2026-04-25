const API_BASE = "";
const BRANDING_UPDATED_AT_KEY = "siteConfigUpdatedAt";
const CUSTOMER_TOKEN_KEY = "customerToken";

let branding = null;
let menuProducts = [];
let menuCategories = [];
let activeMenuCategory = "all";
let currentCustomer = null;
let currentModalProductId = "";
let productFeedbackTimer = null;
let myOrdersCache = [];

const form = document.getElementById("order-form");
const totalText = document.getElementById("total");
const confirmation = document.getElementById("confirmation");
const submitBtn = document.getElementById("submit-order");
const menuGrid = document.getElementById("menu-grid");
const menuCategoryTabs = document.getElementById("menu-category-tabs");
const menuLoading = document.getElementById("menu-loading");
const menuEmpty = document.getElementById("menu-empty");
const orderLines = document.getElementById("order-lines");
const orderBlocked = document.getElementById("order-blocked");
const customerRequired = document.getElementById("customer-required");
const orderProfileHint = document.getElementById("order-profile-hint");
const loginCtaBanner = document.getElementById("login-cta-banner");
const loginCtaBtn = document.getElementById("login-cta-btn");

const registerForm = document.getElementById("customer-register-form");
const loginForm = document.getElementById("customer-login-form");
const registerSubmit = document.getElementById("customer-register-submit");
const loginSubmit = document.getElementById("customer-login-submit");
const customerAuthPanels = document.getElementById("customer-auth-panels");
const authModal = document.getElementById("auth-modal");
const authModalBackdrop = document.getElementById("auth-modal-backdrop");
const authModalClose = document.getElementById("auth-modal-close");
const switchLoginBtn = document.getElementById("switch-login");
const switchRegisterBtn = document.getElementById("switch-register");
const customerSession = document.getElementById("customer-session");
const customerLogoutBtn = document.getElementById("customer-logout-btn");
const customerAuthError = document.getElementById("customer-auth-error");
const navLoginBtn = document.getElementById("nav-login-btn");
const navRegisterBtn = document.getElementById("nav-register-btn");
const navCustomerSession = document.getElementById("nav-customer-session");
const navCustomerEmail = document.getElementById("nav-customer-email");
const navLogoutBtn = document.getElementById("nav-logout-btn");
const navProfileBtn = document.getElementById("nav-profile-btn");
const navCartBadge = document.getElementById("nav-cart-badge");
const navCommandBtn = document.getElementById("br-nav-command");
const customerActionsSection = document.getElementById("customer-actions");
const openOrderFlowBtn = document.getElementById("open-order-flow-btn");
const openTrackFlowBtn = document.getElementById("open-track-flow-btn");

const profileModal = document.getElementById("profile-modal");
const profileModalBackdrop = document.getElementById("profile-modal-backdrop");
const profileModalClose = document.getElementById("profile-modal-close");
const profileForm = document.getElementById("profile-form");
const profileSubmit = document.getElementById("profile-submit");
const profileMessage = document.getElementById("profile-message");
const orderFlowModal = document.getElementById("order-flow-modal");
const orderFlowBackdrop = document.getElementById("order-flow-backdrop");
const orderFlowClose = document.getElementById("order-flow-close");
const trackFlowModal = document.getElementById("track-flow-modal");
const trackFlowBackdrop = document.getElementById("track-flow-backdrop");
const trackFlowClose = document.getElementById("track-flow-close");

const myOrdersForm = document.getElementById("my-orders-form");
const myOrdersSubmit = document.getElementById("my-orders-submit");
const myOrdersLocked = document.getElementById("my-orders-locked");
const myOrdersError = document.getElementById("my-orders-error");
const myOrdersResults = document.getElementById("my-orders-results");

const orderDetailModal = document.getElementById("order-detail-modal");
const orderDetailBackdrop = document.getElementById("order-detail-backdrop");
const orderDetailClose = document.getElementById("order-detail-close");
const orderDetailTitle = document.getElementById("order-detail-title");
const orderDetailBody = document.getElementById("order-detail-body");
const orderDetailCancel = document.getElementById("order-detail-cancel");
const orderDetailError = document.getElementById("order-detail-error");

const productModal = document.getElementById("product-modal");
const productModalBackdrop = document.getElementById("product-modal-backdrop");
const productModalClose = document.getElementById("product-modal-close");
const productModalImage = document.getElementById("product-modal-image");
const productModalTitle = document.getElementById("product-modal-title");
const productModalDesc = document.getElementById("product-modal-desc");
const productModalPrice = document.getElementById("product-modal-price");
const productModalQty = document.getElementById("product-modal-qty");
const productModalQtyDec = document.getElementById("product-modal-qty-dec");
const productModalQtyInc = document.getElementById("product-modal-qty-inc");
const productModalAdd = document.getElementById("product-modal-add");
const productModalFeedback = document.getElementById("product-modal-feedback");

function clampQtyValue(raw, min = 1, max = 20) {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function syncProductModalQtyInput() {
  if (!(productModalQty instanceof HTMLInputElement)) return;
  productModalQty.value = String(clampQtyValue(productModalQty.value));
}

function getCustomerToken() {
  return localStorage.getItem(CUSTOMER_TOKEN_KEY) || "";
}

function setCustomerToken(token) {
  if (!token) localStorage.removeItem(CUSTOMER_TOKEN_KEY);
  else localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
}

function authHeaders() {
  return { Authorization: `Bearer ${getCustomerToken()}` };
}

function showInlineError(node, message) {
  if (!node) return;
  if (!message) {
    node.classList.add("hidden");
    node.textContent = "";
    return;
  }
  node.classList.remove("hidden");
  node.textContent = message;
}

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
  if (fixed.startsWith("http://") || fixed.startsWith("https://") || fixed.startsWith("/")) return fixed;
  return `/${fixed.replace(/^\/+/, "")}`;
}

function formatMoney(value) {
  const loc = branding?.locale || "fr-FR";
  const cur = branding?.currency || "EUR";
  return Number(value || 0).toLocaleString(loc, { style: "currency", currency: cur });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = String(text ?? "");
  return div.innerHTML;
}

function escapeAttr(text) {
  return String(text).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

const FETCH_TIMEOUT_MS = 18000;

function explainFetchFailure(err) {
  if (err?.name === "AbortError") return "Délai dépassé. Réessayez.";
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "Pas de connexion Internet.";
  }
  return "Impossible de joindre le serveur. Vérifiez votre connexion.";
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(tid);
  }
}

/** Fetch JSON avec délai max ; une nouvelle tentative pour les GET en cas d’échec réseau ou 502–504. */
async function fetchJson(url, init = {}) {
  const method = String(init.method || "GET").toUpperCase();

  async function once() {
    try {
      const res = await fetchWithTimeout(url, init);
      const data = await res.json().catch(() => ({}));
      return { res, data };
    } catch (err) {
      throw new Error(explainFetchFailure(err));
    }
  }

  try {
    let pair = await once();
    if (method === "GET" && !pair.res.ok && pair.res.status >= 502 && pair.res.status <= 504) {
      await new Promise((r) => setTimeout(r, 450));
      pair = await once();
    }
    return pair;
  } catch (first) {
    if (method !== "GET") throw first;
    await new Promise((r) => setTimeout(r, 450));
    try {
      return await once();
    } catch {
      throw first;
    }
  }
}

const offlineBanner = document.getElementById("offline-banner");

function syncOfflineBanner() {
  if (!offlineBanner) return;
  const off = navigator.onLine === false;
  offlineBanner.classList.toggle("hidden", !off);
  document.body.classList.toggle("offline", off);
}

window.addEventListener("online", syncOfflineBanner);
window.addEventListener("offline", syncOfflineBanner);

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
  if (theme.topBarColor) root.style.setProperty("--topbar-bg", theme.topBarColor);
  if (theme.heroColor) root.style.setProperty("--hero-bg", theme.heroColor);
  else if (theme.heroGradient) root.style.setProperty("--hero-bg", `linear-gradient(${theme.heroGradient})`);
  if (theme.badgeBg) root.style.setProperty("--badge-bg", theme.badgeBg);

  const hero = document.getElementById("br-hero");
  if (hero) {
    hero.style.backgroundImage = "";
    hero.style.backgroundSize = "";
    hero.style.backgroundPosition = "";
  }

  const meta = document.getElementById("br-meta-desc");
  if (meta && t.metaDescription) meta.setAttribute("content", t.metaDescription);
  document.title = `${b.siteName || "Commerce"} — ${t.pageTitleSuffix || "Commande"}`;

  document.querySelectorAll('link[rel="icon"]').forEach((node) => node.remove());
  const faviconUrl = normalizeBrandingUrl(images.favicon);
  if (faviconUrl) {
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = faviconUrl;
    document.head.appendChild(link);
  }

  const logoEl = document.getElementById("br-logo");
  const heroImgEl = document.getElementById("br-hero-image");
  const logoUrl = normalizeBrandingUrl(images.logo);
  if (logoEl && logoUrl) {
    logoEl.src = logoUrl;
    logoEl.classList.remove("hidden");
    logoEl.alt = b.siteName || "";
    logoEl.onerror = () => logoEl.classList.add("hidden");
  }

  const heroVisualUrl = normalizeBrandingUrl(images.heroBackground || images.logo);
  if (heroImgEl && heroVisualUrl) {
    heroImgEl.src = heroVisualUrl;
    heroImgEl.classList.remove("hidden");
    heroImgEl.alt = `Visuel ${b.siteName || "site"}`;
    heroImgEl.onerror = () => heroImgEl.classList.add("hidden");
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
  if (leg) leg.textContent = labels.selectItemsLegend || t.fieldsetLegend || "Sélection";
  const notes = document.getElementById("br-notes");
  if (notes && t.notesPlaceholder) notes.placeholder = t.notesPlaceholder;
  const footer = document.getElementById("br-footer");
  if (footer) footer.textContent = `© ${year} ${t.footerCopyright || b.siteName || ""}`;
  if (submitBtn && t.confirmButton) submitBtn.textContent = t.confirmButton;
}

async function loadBranding() {
  try {
    const { res, data } = await fetchJson(`${API_BASE}/api/branding?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error();
    branding = data;
    applyBrandingToDom(data);
  } catch {
    branding = { siteName: "Commerce", locale: "fr-FR", currency: "EUR", contact: {}, texts: {} };
  }
}

function calculateTotal() {
  if (!form || !menuProducts.length) {
    if (totalText) totalText.textContent = `Total: ${formatMoney(0)}`;
    if (navCartBadge) {
      navCartBadge.textContent = "Panier: 0 article";
      navCartBadge.classList.add("hidden");
    }
    return 0;
  }
  const data = new FormData(form);
  let total = 0;
  let itemsCount = 0;
  menuProducts.forEach((p) => {
    const qty = Number(data.get(`qty-${p._id}`)) || 0;
    total += qty * p.price;
    itemsCount += Math.max(0, qty);
  });
  totalText.textContent = `Total: ${formatMoney(total)}`;
  if (navCartBadge) {
    navCartBadge.textContent = `Panier: ${itemsCount} ${itemsCount > 1 ? "articles" : "article"}`;
    navCartBadge.classList.toggle("hidden", !currentCustomer || itemsCount <= 0);
  }
  return total;
}

function getMenuCategories() {
  const orderMap = new Map(
    menuCategories.map((c) => [String(c.name || "").trim(), Number(c.sortOrder) || 0])
  );
  const set = new Set();
  menuProducts.forEach((p) => {
    const cat = String(p.category || "").trim() || "Général";
    set.add(cat);
  });
  return Array.from(set).sort((a, b) => {
    const ao = orderMap.has(a) ? orderMap.get(a) : Number.MAX_SAFE_INTEGER;
    const bo = orderMap.has(b) ? orderMap.get(b) : Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return a.localeCompare(b, "fr");
  });
}

function getVisibleMenuProducts() {
  if (activeMenuCategory === "all") return menuProducts;
  return menuProducts.filter((p) => (String(p.category || "").trim() || "Général") === activeMenuCategory);
}

function renderCategoryTabs() {
  if (!menuCategoryTabs) return;
  const categories = getMenuCategories();
  if (!categories.length) {
    menuCategoryTabs.classList.add("hidden");
    menuCategoryTabs.innerHTML = "";
    return;
  }
  if (activeMenuCategory !== "all" && !categories.includes(activeMenuCategory)) {
    activeMenuCategory = "all";
  }
  const allActive = activeMenuCategory === "all";
  const buttons = [
    `<button type="button" class="menu-category-tab${allActive ? " menu-category-tab--active" : ""}" data-cat="all">Tout</button>`,
    ...categories.map((cat) => {
      const active = activeMenuCategory === cat;
      return `<button type="button" class="menu-category-tab${active ? " menu-category-tab--active" : ""}" data-cat="${escapeAttr(cat)}">${escapeHtml(cat)}</button>`;
    }),
  ];
  menuCategoryTabs.innerHTML = buttons.join("");
  menuCategoryTabs.classList.remove("hidden");
}

function buildOrderText(order) {
  const lines = (order.items || []).map((item) => `- ${item.label} x${item.qty}`);
  return [
    `Commande ${order.id}`,
    `Client: ${order.customer.name}`,
    `Tel: ${order.customer.phone}`,
    `Email: ${order.customer.email}`,
    `Adresse: ${order.customer.address}`,
    `Date souhaitée: ${order.deliveryDate}`,
    `Paiement: ${order.paymentMethod}`,
    ...lines,
    `Total: ${formatMoney(order.total)}`,
    `Notes: ${order.notes || "Aucune"}`,
  ].join("\n");
}

function orderStatusLabel(status) {
  const map = {
    nouvelle: "Nouvelle",
    confirmee: "Confirmée",
    livree: "Livrée",
    annulee: "Annulée",
  };
  return map[status] || status || "—";
}

function paymentMethodLabel(method) {
  if (method === "enligne") return "Paiement en ligne";
  if (method === "livraison") return "Paiement à la livraison";
  return method || "—";
}

function orderCanBeCancelled(order) {
  return order?.status === "nouvelle";
}

function renderMyOrders(orders) {
  if (!myOrdersResults) return;
  myOrdersCache = orders;
  myOrdersResults.innerHTML = "";
  if (!orders.length) {
    myOrdersResults.classList.remove("hidden");
    myOrdersResults.innerHTML = `<p class="section-intro">Aucune commande pour votre compte.</p>`;
    return;
  }
  const loc = branding?.locale || "fr-FR";
  orders.forEach((order) => {
    const card = document.createElement("article");
    card.className = "track-card";
    const oid = escapeAttr(order._id || "");
    const itemsText = (order.items || []).map((it) => `${escapeHtml(it.label)} × ${it.qty}`).join(", ");
    const cancelable = orderCanBeCancelled(order);
    card.innerHTML = `
      <div class="track-card-head">
        <h3>${escapeHtml(order.id)}</h3>
      </div>
      <p><strong>Statut :</strong> ${escapeHtml(orderStatusLabel(order.status))}</p>
      <p><strong>Passée le :</strong> ${escapeHtml(new Date(order.createdAt).toLocaleString(loc))}</p>
      <p><strong>Total :</strong> ${escapeHtml(formatMoney(order.total))}</p>
      <p><strong>Aperçu :</strong> ${itemsText || "—"}</p>
      <div class="track-card-actions">
        <button type="button" class="btn btn-primary order-open-detail" data-order-id="${oid}">
          Voir le détail
        </button>
        ${
          cancelable
            ? `<button type="button" class="btn btn-secondary order-cancel-quick" data-order-id="${oid}">
          Annuler
        </button>`
            : ""
        }
      </div>
    `;
    myOrdersResults.appendChild(card);
  });
  myOrdersResults.classList.remove("hidden");
}

function renderOrderDetailHtml(order) {
  const loc = branding?.locale || "fr-FR";
  const cust = order.customer || {};
  const rows = (order.items || [])
    .map((it) => {
      const line = Number(it.qty) * Number(it.unitPrice);
      return `<tr>
        <td>${escapeHtml(it.label)}</td>
        <td class="num">${escapeHtml(String(it.qty))}</td>
        <td class="num">${escapeHtml(formatMoney(it.unitPrice))}</td>
        <td class="num">${escapeHtml(formatMoney(line))}</td>
      </tr>`;
    })
    .join("");
  return `
    <dl>
      <dt>Statut</dt><dd>${escapeHtml(orderStatusLabel(order.status))}</dd>
      <dt>Date de commande</dt><dd>${escapeHtml(new Date(order.createdAt).toLocaleString(loc))}</dd>
      <dt>Date de livraison souhaitée</dt><dd>${escapeHtml(order.deliveryDate || "—")}</dd>
      <dt>Mode de paiement</dt><dd>${escapeHtml(paymentMethodLabel(order.paymentMethod))}</dd>
      ${
        order.notes
          ? `<dt>Remarques</dt><dd>${escapeHtml(order.notes)}</dd>`
          : ""
      }
    </dl>
    <p><strong>Coordonnées de livraison</strong></p>
    <dl>
      <dt>Nom</dt><dd>${escapeHtml(cust.name || "—")}</dd>
      <dt>Téléphone</dt><dd>${escapeHtml(cust.phone || "—")}</dd>
      <dt>E-mail</dt><dd>${escapeHtml(cust.email || "—")}</dd>
      <dt>Adresse</dt><dd>${escapeHtml(cust.address || "—")}</dd>
    </dl>
    <p><strong>Lignes de commande</strong></p>
    <div class="order-detail-table-wrap">
      <table class="order-detail-table">
        <thead>
          <tr>
            <th>Article</th>
            <th class="num">Qté</th>
            <th class="num">Prix unitaire</th>
            <th class="num">Sous-total</th>
          </tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="4">Aucune ligne</td></tr>`}</tbody>
      </table>
    </div>
    <p><strong>Total : ${escapeHtml(formatMoney(order.total))}</strong></p>
  `;
}

function closeOrderDetailModal() {
  orderDetailModal?.classList.add("hidden");
  showInlineError(orderDetailError, "");
}

function openOrderDetailModal(order) {
  if (!orderDetailModal || !orderDetailTitle || !orderDetailBody) return;
  orderDetailTitle.textContent = order.id ? `Commande ${order.id}` : "Détail de la commande";
  orderDetailBody.innerHTML = renderOrderDetailHtml(order);
  showInlineError(orderDetailError, "");
  const canCancel = orderCanBeCancelled(order);
  if (orderDetailCancel) {
    orderDetailCancel.classList.toggle("hidden", !canCancel);
    orderDetailCancel.dataset.orderId = order._id || "";
  }
  orderDetailModal.classList.remove("hidden");
}

async function cancelCustomerOrder(orderId, fromModal) {
  if (!orderId || !currentCustomer) return;
  if (!window.confirm("Confirmer l’annulation de cette commande ?")) return;
  const errNode = fromModal ? orderDetailError : myOrdersError;
  showInlineError(errNode, "");
  const modalShowsThisOrder =
    orderDetailModal &&
    !orderDetailModal.classList.contains("hidden") &&
    orderDetailCancel?.dataset.orderId === orderId;
  try {
    const { res, data } = await fetchJson(`${API_BASE}/api/orders/my/annuler`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({ orderId }),
    });
    if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
    await loadMyOrders();
    const updated = myOrdersCache.find((o) => o._id === orderId);
    if (modalShowsThisOrder) {
      if (updated) openOrderDetailModal(updated);
      else closeOrderDetailModal();
    }
  } catch (err) {
    showInlineError(errNode, err.message || "Annulation impossible.");
  }
}

function renderMenu() {
  menuGrid.innerHTML = "";
  getVisibleMenuProducts().forEach((p) => {
    const article = document.createElement("article");
    article.className = "menu-item menu-item-card";
    article.setAttribute("role", "button");
    article.setAttribute("tabindex", "0");
    article.setAttribute("aria-label", `Voir les détails de ${p.name}`);
    article.dataset.productId = p._id;
    const imgHtml = p.imageUrl
      ? `<div class="menu-item-media"><img src="${escapeAttr(p.imageUrl)}" alt="" loading="lazy" /></div>`
      : `<div class="menu-item-media menu-item-media--empty" aria-hidden="true"></div>`;
    article.innerHTML = `
      ${imgHtml}
      <div class="menu-item-body">
        <h3>${escapeHtml(p.name)}</h3>
        ${p.description ? `<p class="menu-desc">${escapeHtml(p.description)}</p>` : ""}
        <p class="price">${formatMoney(p.price)}</p>
        <div class="menu-item-inline-actions" data-prevent-open="1">
          <label class="menu-item-inline-qty">
            <span class="menu-item-inline-qty-label">Qté</span>
            <button type="button" class="menu-item-qty-step" data-qty-step="${escapeAttr(p._id)}" data-dir="dec" aria-label="Diminuer la quantité">−</button>
            <input
              type="number"
              min="1"
              max="20"
              step="1"
              value="1"
              class="menu-item-qty-input"
              data-qty-input="${escapeAttr(p._id)}"
            />
            <button type="button" class="menu-item-qty-step" data-qty-step="${escapeAttr(p._id)}" data-dir="inc" aria-label="Augmenter la quantité">+</button>
          </label>
          <button type="button" class="btn btn-secondary menu-item-add-btn menu-item-add-label" data-add-product="${escapeAttr(p._id)}">
            Ajouter au panier
          </button>
          <span class="menu-item-add-feedback hidden" data-add-feedback="${escapeAttr(p._id)}" aria-live="polite"></span>
        </div>
      </div>
    `;
    menuGrid.appendChild(article);
  });
}

function renderOrderFields() {
  orderLines.innerHTML = "";
  getVisibleMenuProducts().forEach((p) => {
    const label = document.createElement("label");
    label.className = "qty";
    label.innerHTML = `${escapeHtml(p.name)} <input type="number" min="0" max="20" value="0" name="qty-${p._id}" />`;
    orderLines.appendChild(label);
  });
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
  const loadingText = branding?.texts?.menuLoading || "Chargement...";
  menuLoading.textContent = loadingText;
  try {
    const [catOut, prodOut] = await Promise.all([
      fetchJson(`${API_BASE}/api/categories`),
      fetchJson(`${API_BASE}/api/products/menu`),
    ]);
    menuCategories = catOut.res.ok ? catOut.data.categories || [] : [];
    if (!prodOut.res.ok) throw new Error(prodOut.data.error || "Erreur menu");
    menuProducts = prodOut.data.products || [];
    activeMenuCategory = "all";
  } catch (err) {
    menuProducts = [];
    menuCategories = [];
    menuLoading.textContent =
      err.message ||
      "Impossible de charger le catalogue. Vérifiez que le serveur tourne (npm start).";
    return;
  }
  menuLoading.classList.add("hidden");
  if (!menuProducts.length) {
    menuEmpty.classList.remove("hidden");
    orderBlocked.classList.remove("hidden");
    return;
  }
  renderCategoryTabs();
  renderMenu();
  renderOrderFields();
  setDeliveryDateMin();
  calculateTotal();
  updateOrderAccessState();
}

function openProductModal(product) {
  if (!productModal) return;
  currentModalProductId = product._id || "";
  if (productFeedbackTimer) {
    clearTimeout(productFeedbackTimer);
    productFeedbackTimer = null;
  }
  productModalFeedback?.classList.add("hidden");
  if (productModalQty) productModalQty.value = "1";
  productModalTitle.textContent = product.name || "Produit";
  productModalDesc.textContent = product.description || "Aucune description.";
  productModalPrice.textContent = formatMoney(product.price);
  if (product.imageUrl) {
    productModalImage.src = product.imageUrl;
    productModalImage.classList.remove("hidden");
  } else {
    productModalImage.removeAttribute("src");
    productModalImage.classList.add("hidden");
  }
  productModal.classList.remove("hidden");
}

function closeProductModal() {
  if (!productModal) return;
  currentModalProductId = "";
  productModal.classList.add("hidden");
  productModalFeedback?.classList.add("hidden");
}

function addCurrentProductToCart() {
  if (!currentModalProductId) return;
  syncProductModalQtyInput();
  const safeQty = clampQtyValue(productModalQty?.value);
  const input = form?.querySelector(`input[name="qty-${CSS.escape(currentModalProductId)}"]`);
  if (!(input instanceof HTMLInputElement)) return;
  const currentQty = Number(input.value) || 0;
  const maxQty = Number(input.max) || 20;
  input.value = String(Math.min(currentQty + safeQty, maxQty));
  calculateTotal();
  if (productModalFeedback) {
    productModalFeedback.textContent = safeQty > 1 ? `Ajouté au panier (+${safeQty})` : "Ajouté au panier";
    productModalFeedback.classList.remove("hidden");
  }
  if (productFeedbackTimer) clearTimeout(productFeedbackTimer);
  productFeedbackTimer = setTimeout(() => productModalFeedback?.classList.add("hidden"), 1200);
}

async function fetchCustomerMe() {
  const token = getCustomerToken();
  if (!token) {
    currentCustomer = null;
    return;
  }
  try {
    const { res, data } = await fetchJson(`${API_BASE}/api/customer-auth/me`, { headers: authHeaders() });
    if (!res.ok) throw new Error(data.error || "Session invalide");
    currentCustomer = data.user;
    fillProfileFormFromCustomer();
  } catch {
    currentCustomer = null;
    setCustomerToken("");
  }
}

/** Règles alignées sur l’API profil / commande */
function hasCustomerProfileComplete() {
  if (!currentCustomer) return false;
  const n = String(currentCustomer.fullName || "").trim();
  const p = String(currentCustomer.phone || "").trim();
  const a = String(currentCustomer.address || "").trim();
  return n.length >= 2 && p.length >= 6 && a.length >= 5;
}

/** Synchronise le formulaire « Mon profil » avec la session */
function fillProfileFormFromCustomer() {
  if (!profileForm || !currentCustomer) return;
  const fullNameEl = profileForm.querySelector('[name="fullName"]');
  const phoneEl = profileForm.querySelector('[name="phone"]');
  const addrEl = profileForm.querySelector('[name="address"]');
  if (fullNameEl) fullNameEl.value = currentCustomer.fullName || "";
  if (phoneEl) phoneEl.value = currentCustomer.phone || "";
  if (addrEl) addrEl.value = currentCustomer.address || "";
}

function showProfileMessage(text, ok) {
  if (!profileMessage) return;
  if (!text) {
    profileMessage.textContent = "";
    profileMessage.classList.add("hidden");
    profileMessage.classList.remove("confirmation", "admin-error");
    return;
  }
  profileMessage.textContent = text;
  profileMessage.classList.remove("hidden");
  profileMessage.classList.toggle("confirmation", !!ok);
  profileMessage.classList.toggle("admin-error", !ok);
}

function updateOrderAccessState() {
  const isConnected = !!currentCustomer;
  const canOrder = isConnected && menuProducts.length > 0;
  customerActionsSection?.classList.toggle("hidden", !isConnected);
  loginCtaBanner?.classList.toggle("hidden", isConnected);
  form?.classList.toggle("hidden", !canOrder);
  customerRequired?.classList.toggle("hidden", isConnected);
  orderProfileHint?.classList.toggle("hidden", !canOrder);
  if (myOrdersLocked) myOrdersLocked.classList.toggle("hidden", isConnected);
}

function renderCustomerState() {
  const isConnected = !!currentCustomer;
  customerAuthPanels?.classList.toggle("hidden", isConnected);
  customerSession?.classList.toggle("hidden", !isConnected);
  navCommandBtn?.classList.add("hidden");
  navLoginBtn?.classList.toggle("hidden", isConnected);
  navRegisterBtn?.classList.toggle("hidden", isConnected);
  navCustomerSession?.classList.toggle("hidden", !isConnected);
  navProfileBtn?.classList.toggle("hidden", !isConnected);
  navCartBadge?.classList.toggle("hidden", !isConnected);
  if (navCustomerEmail) {
    navCustomerEmail.textContent = isConnected ? currentCustomer.email : "";
  }
  if (isConnected) {
    fillProfileFormFromCustomer();
    closeAuthModal();
  }
  updateOrderAccessState();
}

function openOrderFlowModal() {
  if (!currentCustomer) return;
  closeAuthModal();
  closeProfileModal();
  orderFlowModal?.classList.remove("hidden");
}

function closeOrderFlowModal() {
  orderFlowModal?.classList.add("hidden");
}

function openTrackFlowModal() {
  if (!currentCustomer) return;
  closeAuthModal();
  closeProfileModal();
  trackFlowModal?.classList.remove("hidden");
  void loadMyOrders();
}

function closeTrackFlowModal() {
  trackFlowModal?.classList.add("hidden");
}

function openProfileModal() {
  if (!currentCustomer) return;
  closeAuthModal();
  closeOrderFlowModal();
  closeTrackFlowModal();
  closeProductModal();
  fillProfileFormFromCustomer();
  profileModal?.classList.remove("hidden");
}

function closeProfileModal() {
  profileModal?.classList.add("hidden");
  showProfileMessage("", false);
}

function showAuthPanel(panel) {
  const showRegister = panel === "register";
  registerForm?.classList.toggle("hidden", !showRegister);
  loginForm?.classList.toggle("hidden", showRegister);
  switchLoginBtn?.classList.toggle("auth-switch-active", !showRegister);
  switchRegisterBtn?.classList.toggle("auth-switch-active", showRegister);
  closeProfileModal();
  closeOrderFlowModal();
  closeTrackFlowModal();
  authModal?.classList.remove("hidden");
}

function closeAuthModal() {
  authModal?.classList.add("hidden");
}

async function loadMyOrders() {
  showInlineError(myOrdersError, "");
  if (!currentCustomer) return;
  const previousLabel = myOrdersSubmit?.textContent || "Voir mes commandes";
  if (myOrdersSubmit) {
    myOrdersSubmit.disabled = true;
    myOrdersSubmit.textContent = "Chargement...";
  }
  try {
    const { res, data } = await fetchJson(`${API_BASE}/api/orders/my`, { headers: authHeaders() });
    if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
    renderMyOrders(data.orders || []);
  } catch (err) {
    showInlineError(myOrdersError, err.message || "Impossible de charger vos commandes.");
  } finally {
    if (myOrdersSubmit) {
      myOrdersSubmit.disabled = false;
      myOrdersSubmit.textContent = previousLabel;
    }
  }
}

async function handleCustomerAuth(endpoint, formNode, submitNode, successMessage) {
  showInlineError(customerAuthError, "");
  const fd = new FormData(formNode);
  const email = String(fd.get("email") || "").trim().toLowerCase();
  const password = String(fd.get("password") || "");
  const payload = { email, password };
  if (endpoint === "register") {
    payload.fullName = String(fd.get("fullName") || "").trim();
    payload.phone = String(fd.get("phone") || "").trim();
    payload.address = String(fd.get("address") || "").trim();
  }
  const prev = submitNode?.textContent || "Envoyer";
  if (submitNode) {
    submitNode.disabled = true;
    submitNode.textContent = "En cours...";
  }
  try {
    const { res, data } = await fetchJson(`${API_BASE}/api/customer-auth/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
    setCustomerToken(data.token || "");
    currentCustomer = data.user || null;
    formNode.reset();
    renderCustomerState();
    showInlineError(customerAuthError, successMessage);
    customerAuthError?.classList.remove("admin-error");
    customerAuthError?.classList.add("confirmation");
    await loadMyOrders();
  } catch (err) {
    customerAuthError?.classList.remove("confirmation");
    customerAuthError?.classList.add("admin-error");
    showInlineError(customerAuthError, err.message || "Erreur d'authentification.");
  } finally {
    if (submitNode) {
      submitNode.disabled = false;
      submitNode.textContent = prev;
    }
  }
}

registerForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  await handleCustomerAuth("register", registerForm, registerSubmit, "Compte créé et connecté.");
});

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  await handleCustomerAuth("login", loginForm, loginSubmit, "Connexion réussie.");
});

customerLogoutBtn?.addEventListener("click", () => {
  closeProfileModal();
  closeOrderFlowModal();
  closeTrackFlowModal();
  setCustomerToken("");
  currentCustomer = null;
  if (myOrdersResults) {
    myOrdersResults.classList.add("hidden");
    myOrdersResults.innerHTML = "";
  }
  showInlineError(customerAuthError, "");
  showInlineError(myOrdersError, "");
  showProfileMessage("", false);
  renderCustomerState();
});

profileForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentCustomer) return;
  showProfileMessage("", false);
  const fd = new FormData(profileForm);
  const body = {
    fullName: String(fd.get("fullName") || "").trim(),
    phone: String(fd.get("phone") || "").trim(),
    address: String(fd.get("address") || "").trim(),
  };
  const prev = profileSubmit?.textContent || "Enregistrer";
  if (profileSubmit) {
    profileSubmit.disabled = true;
    profileSubmit.textContent = "Enregistrement...";
  }
  try {
    const { res, data } = await fetchJson(`${API_BASE}/api/customer-auth/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
    currentCustomer = data.user || currentCustomer;
    fillProfileFormFromCustomer();
    showProfileMessage("Modifications enregistrées.", true);
  } catch (err) {
    showProfileMessage(err.message || "Impossible d'enregistrer.", false);
  } finally {
    if (profileSubmit) {
      profileSubmit.disabled = false;
      profileSubmit.textContent = prev;
    }
  }
});

navLogoutBtn?.addEventListener("click", () => {
  customerLogoutBtn?.click();
});

navLoginBtn?.addEventListener("click", () => {
  showAuthPanel("login");
});

navRegisterBtn?.addEventListener("click", () => {
  showAuthPanel("register");
});

loginCtaBtn?.addEventListener("click", () => {
  showAuthPanel("login");
});

openOrderFlowBtn?.addEventListener("click", openOrderFlowModal);
openTrackFlowBtn?.addEventListener("click", openTrackFlowModal);
orderFlowClose?.addEventListener("click", closeOrderFlowModal);
orderFlowBackdrop?.addEventListener("click", closeOrderFlowModal);
trackFlowClose?.addEventListener("click", closeTrackFlowModal);
trackFlowBackdrop?.addEventListener("click", closeTrackFlowModal);

navProfileBtn?.addEventListener("click", () => {
  openProfileModal();
});

profileModalClose?.addEventListener("click", closeProfileModal);
profileModalBackdrop?.addEventListener("click", closeProfileModal);

switchLoginBtn?.addEventListener("click", () => showAuthPanel("login"));
switchRegisterBtn?.addEventListener("click", () => showAuthPanel("register"));
authModalClose?.addEventListener("click", closeAuthModal);
authModalBackdrop?.addEventListener("click", closeAuthModal);

myOrdersResults?.addEventListener("click", (event) => {
  const t = event.target;
  if (!(t instanceof HTMLElement)) return;
  const openBtn = t.closest(".order-open-detail");
  const cancelBtn = t.closest(".order-cancel-quick");
  if (openBtn instanceof HTMLElement) {
    const id = openBtn.dataset.orderId;
    const order = myOrdersCache.find((o) => o._id === id);
    if (order) openOrderDetailModal(order);
    return;
  }
  if (cancelBtn instanceof HTMLElement) {
    const id = cancelBtn.dataset.orderId;
    if (id) void cancelCustomerOrder(id, false);
  }
});

orderDetailClose?.addEventListener("click", closeOrderDetailModal);
orderDetailBackdrop?.addEventListener("click", closeOrderDetailModal);
orderDetailCancel?.addEventListener("click", () => {
  const id = orderDetailCancel?.dataset.orderId;
  if (id) void cancelCustomerOrder(id, true);
});

form?.addEventListener("input", calculateTotal);

menuGrid?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const addBtn = target.closest(".menu-item-add-btn");
  const stepBtn = target.closest(".menu-item-qty-step");
  if (stepBtn instanceof HTMLButtonElement) {
    const productId = stepBtn.dataset.qtyStep;
    if (!productId) return;
    const qtyInput = menuGrid.querySelector(`.menu-item-qty-input[data-qty-input="${CSS.escape(productId)}"]`);
    if (!(qtyInput instanceof HTMLInputElement)) return;
    const min = Number(qtyInput.min) || 1;
    const max = Number(qtyInput.max) || 20;
    const current = Number(qtyInput.value) || min;
    const next = stepBtn.dataset.dir === "dec" ? current - 1 : current + 1;
    qtyInput.value = String(Math.min(max, Math.max(min, next)));
    return;
  }
  if (addBtn instanceof HTMLButtonElement) {
    const productId = addBtn.dataset.addProduct;
    if (!productId) return;
    if (!currentCustomer) {
      showAuthPanel("login");
      showInlineError(customerAuthError, "Connectez-vous pour ajouter des produits au panier.");
      return;
    }
    const qtyInput = menuGrid.querySelector(`.menu-item-qty-input[data-qty-input="${CSS.escape(productId)}"]`);
    const requested = qtyInput instanceof HTMLInputElement ? Number(qtyInput.value) : 1;
    const qtyToAdd = Math.min(20, Math.max(1, Number.isFinite(requested) ? requested : 1));
    const orderInput = form?.querySelector(`input[name="qty-${CSS.escape(productId)}"]`);
    if (!(orderInput instanceof HTMLInputElement)) return;
    const current = Number(orderInput.value) || 0;
    const maxQty = Number(orderInput.max) || 20;
    orderInput.value = String(Math.min(current + qtyToAdd, maxQty));
    calculateTotal();

    const fb = menuGrid.querySelector(`.menu-item-add-feedback[data-add-feedback="${CSS.escape(productId)}"]`);
    if (fb instanceof HTMLElement) {
      fb.textContent = qtyToAdd > 1 ? `Ajouté au panier (+${qtyToAdd})` : "Ajouté au panier";
      fb.classList.remove("hidden");
      window.setTimeout(() => fb.classList.add("hidden"), 1200);
    }
    return;
  }
  if (target.closest(".menu-item-inline-actions")) return;
  const card = target.closest(".menu-item-card");
  if (!(card instanceof HTMLElement)) return;
  const product = menuProducts.find((p) => p._id === card.dataset.productId);
  if (!product) return;
  openProductModal(product);
});

menuGrid?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const target = event.target;
  if (!(target instanceof HTMLElement) || !target.classList.contains("menu-item-card")) return;
  event.preventDefault();
  const product = menuProducts.find((p) => p._id === target.dataset.productId);
  if (!product) return;
  openProductModal(product);
});

menuCategoryTabs?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  const cat = target.dataset.cat;
  if (!cat) return;
  activeMenuCategory = cat;
  renderCategoryTabs();
  renderMenu();
  renderOrderFields();
  calculateTotal();
});

productModalClose?.addEventListener("click", closeProductModal);
productModalBackdrop?.addEventListener("click", closeProductModal);
productModalAdd?.addEventListener("click", addCurrentProductToCart);
productModalQtyDec?.addEventListener("click", () => {
  if (!(productModalQty instanceof HTMLInputElement)) return;
  productModalQty.value = String(clampQtyValue(Number(productModalQty.value) - 1));
});
productModalQtyInc?.addEventListener("click", () => {
  if (!(productModalQty instanceof HTMLInputElement)) return;
  productModalQty.value = String(clampQtyValue(Number(productModalQty.value) + 1));
});
productModalQty?.addEventListener("change", syncProductModalQtyInput);
productModalQty?.addEventListener("blur", syncProductModalQtyInput);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeProductModal();
    closeAuthModal();
    closeProfileModal();
    closeOrderFlowModal();
    closeTrackFlowModal();
    closeOrderDetailModal();
  }
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentCustomer) {
    showInlineError(customerRequired, "Connectez-vous avec votre compte client pour passer commande.");
    return;
  }
  if (!hasCustomerProfileComplete()) {
    confirmation.classList.remove("hidden");
    confirmation.innerHTML =
      "Complétez vos coordonnées (nom, téléphone, adresse) dans <strong>Mon profil</strong> avant de valider.";
    openProfileModal();
    return;
  }
  const data = new FormData(form);
  const itemsPayload = menuProducts
    .map((p) => ({ productId: p._id, qty: Number(data.get(`qty-${p._id}`)) || 0 }))
    .filter((row) => row.qty > 0);
  if (!itemsPayload.length) {
    confirmation.classList.remove("hidden");
    confirmation.textContent = "Veuillez sélectionner au moins un article.";
    return;
  }
  const body = {
    customer: {
      name: String(currentCustomer.fullName || "").trim(),
      phone: String(currentCustomer.phone || "").trim(),
      address: String(currentCustomer.address || "").trim(),
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
    const { res, data: payload } = await fetchJson(`${API_BASE}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(payload.error || `Erreur serveur (${res.status}).`);
    const order = payload.order;
    const text = buildOrderText(order);
    const whatsappUrl = `https://wa.me/${wa}?text=${encodeURIComponent(text)}`;
    const emailUrl = `mailto:${email}?subject=${encodeURIComponent(`Commande ${order.id}`)}&body=${encodeURIComponent(text)}`;
    confirmation.classList.remove("hidden");
    confirmation.innerHTML = `
      <strong>Commande enregistrée (${order.id})</strong><br />
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
    await loadMyOrders();
  } catch (err) {
    confirmation.classList.remove("hidden");
    confirmation.textContent = err.message || "Impossible de joindre le serveur.";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = confirmLabel;
  }
});

async function bootstrap() {
  await loadBranding();
  await fetchCustomerMe();
  renderCustomerState();
  await initMenu();
  if (currentCustomer) await loadMyOrders();
}

window.addEventListener("storage", async (event) => {
  if (event.key === BRANDING_UPDATED_AT_KEY) await loadBranding();
});

syncOfflineBanner();
bootstrap();
