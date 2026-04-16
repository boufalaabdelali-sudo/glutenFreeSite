const API_BASE = "";
const BRANDING_UPDATED_AT_KEY = "siteConfigUpdatedAt";
const CUSTOMER_TOKEN_KEY = "customerToken";

let branding = null;
let menuProducts = [];
let currentCustomer = null;
let currentModalProductId = "";
let productFeedbackTimer = null;

const form = document.getElementById("order-form");
const totalText = document.getElementById("total");
const confirmation = document.getElementById("confirmation");
const submitBtn = document.getElementById("submit-order");
const menuGrid = document.getElementById("menu-grid");
const menuLoading = document.getElementById("menu-loading");
const menuEmpty = document.getElementById("menu-empty");
const orderLines = document.getElementById("order-lines");
const orderBlocked = document.getElementById("order-blocked");
const customerRequired = document.getElementById("customer-required");

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

const myOrdersForm = document.getElementById("my-orders-form");
const myOrdersSubmit = document.getElementById("my-orders-submit");
const myOrdersLocked = document.getElementById("my-orders-locked");
const myOrdersError = document.getElementById("my-orders-error");
const myOrdersResults = document.getElementById("my-orders-results");

const productModal = document.getElementById("product-modal");
const productModalBackdrop = document.getElementById("product-modal-backdrop");
const productModalClose = document.getElementById("product-modal-close");
const productModalImage = document.getElementById("product-modal-image");
const productModalTitle = document.getElementById("product-modal-title");
const productModalDesc = document.getElementById("product-modal-desc");
const productModalPrice = document.getElementById("product-modal-price");
const productModalQty = document.getElementById("product-modal-qty");
const productModalAdd = document.getElementById("product-modal-add");
const productModalFeedback = document.getElementById("product-modal-feedback");

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
    const res = await fetch(`${API_BASE}/api/branding?t=${Date.now()}`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
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
  const lines = (order.items || []).map((item) => `- ${item.label} x${item.qty}`);
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

function orderStatusLabel(status) {
  const map = { nouvelle: "Nouvelle", confirmee: "Confirmee", livree: "Livree", annulee: "Annulee" };
  return map[status] || status || "-";
}

function renderMyOrders(orders) {
  if (!myOrdersResults) return;
  myOrdersResults.innerHTML = "";
  if (!orders.length) {
    myOrdersResults.classList.remove("hidden");
    myOrdersResults.innerHTML = `<p class="section-intro">Aucune commande pour votre compte.</p>`;
    return;
  }
  orders.forEach((order) => {
    const card = document.createElement("article");
    card.className = "track-card";
    const itemsText = (order.items || []).map((it) => `${escapeHtml(it.label)} x${it.qty}`).join(", ");
    card.innerHTML = `
      <h3>${escapeHtml(order.id)}</h3>
      <p><strong>Statut :</strong> ${escapeHtml(orderStatusLabel(order.status))}</p>
      <p><strong>Date :</strong> ${escapeHtml(new Date(order.createdAt).toLocaleString(branding?.locale || "fr-FR"))}</p>
      <p><strong>Total :</strong> ${escapeHtml(formatMoney(order.total))}</p>
      <p><strong>Articles :</strong> ${itemsText || "-"}</p>
    `;
    myOrdersResults.appendChild(card);
  });
  myOrdersResults.classList.remove("hidden");
}

function renderMenu() {
  menuGrid.innerHTML = "";
  menuProducts.forEach((p) => {
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
    const res = await fetch(`${API_BASE}/api/products/menu`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Erreur menu");
    menuProducts = data.products || [];
  } catch {
    menuProducts = [];
    menuLoading.textContent = "Impossible de charger le catalogue. Verifiez que le serveur tourne (npm start).";
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
  const requestedQty = Number(productModalQty?.value) || 1;
  const safeQty = Math.min(20, Math.max(1, requestedQty));
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
    const res = await fetch(`${API_BASE}/api/customer-auth/me`, { headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Session invalide");
    currentCustomer = data.user;
  } catch {
    currentCustomer = null;
    setCustomerToken("");
  }
}

function updateOrderAccessState() {
  const isConnected = !!currentCustomer;
  form?.classList.toggle("hidden", !isConnected || !menuProducts.length);
  customerRequired?.classList.toggle("hidden", isConnected);
  if (myOrdersForm) myOrdersForm.classList.toggle("hidden", !isConnected);
  if (myOrdersLocked) myOrdersLocked.classList.toggle("hidden", isConnected);
}

function renderCustomerState() {
  const isConnected = !!currentCustomer;
  customerAuthPanels?.classList.toggle("hidden", isConnected);
  customerSession?.classList.toggle("hidden", !isConnected);
  navLoginBtn?.classList.toggle("hidden", isConnected);
  navRegisterBtn?.classList.toggle("hidden", isConnected);
  navCustomerSession?.classList.toggle("hidden", !isConnected);
  if (navCustomerEmail) {
    navCustomerEmail.textContent = isConnected ? currentCustomer.email : "";
  }
  if (isConnected) closeAuthModal();
  updateOrderAccessState();
}

function showAuthPanel(panel) {
  const showRegister = panel === "register";
  registerForm?.classList.toggle("hidden", !showRegister);
  loginForm?.classList.toggle("hidden", showRegister);
  switchLoginBtn?.classList.toggle("auth-switch-active", !showRegister);
  switchRegisterBtn?.classList.toggle("auth-switch-active", showRegister);
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
    const res = await fetch(`${API_BASE}/api/orders/my`, { headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
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
  const prev = submitNode?.textContent || "Envoyer";
  if (submitNode) {
    submitNode.disabled = true;
    submitNode.textContent = "En cours...";
  }
  try {
    const res = await fetch(`${API_BASE}/api/customer-auth/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
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
  setCustomerToken("");
  currentCustomer = null;
  if (myOrdersResults) {
    myOrdersResults.classList.add("hidden");
    myOrdersResults.innerHTML = "";
  }
  showInlineError(customerAuthError, "");
  showInlineError(myOrdersError, "");
  renderCustomerState();
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

switchLoginBtn?.addEventListener("click", () => showAuthPanel("login"));
switchRegisterBtn?.addEventListener("click", () => showAuthPanel("register"));
authModalClose?.addEventListener("click", closeAuthModal);
authModalBackdrop?.addEventListener("click", closeAuthModal);

myOrdersForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  await loadMyOrders();
});

form?.addEventListener("input", calculateTotal);

menuGrid?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
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

productModalClose?.addEventListener("click", closeProductModal);
productModalBackdrop?.addEventListener("click", closeProductModal);
productModalAdd?.addEventListener("click", addCurrentProductToCart);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeProductModal();
    closeAuthModal();
  }
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentCustomer) {
    showInlineError(customerRequired, "Connectez-vous avec votre compte client pour passer commande.");
    return;
  }
  const data = new FormData(form);
  const itemsPayload = menuProducts
    .map((p) => ({ productId: p._id, qty: Number(data.get(`qty-${p._id}`)) || 0 }))
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
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload.error || `Erreur serveur (${res.status}).`);
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

bootstrap();
