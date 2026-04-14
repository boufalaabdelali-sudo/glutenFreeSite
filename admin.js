const API_BASE = "";
const TOKEN_KEY = "sg_jwt_token";

const loginSection = document.getElementById("login-section");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const dashboard = document.getElementById("dashboard");
const logoutBtn = document.getElementById("logout-btn");

const ordersBody = document.getElementById("orders-body");
const ordersTable = document.getElementById("orders-table");
const ordersEmpty = document.getElementById("admin-empty");
const exportBtn = document.getElementById("export-btn");
const clearBtn = document.getElementById("clear-btn");
const refreshBtn = document.getElementById("refresh-btn");
const ordersError = document.getElementById("admin-error");

const productsBody = document.getElementById("products-body");
const productsTable = document.getElementById("products-table");
const productsEmpty = document.getElementById("products-empty");
const productsLoading = document.getElementById("products-loading");
const productForm = document.getElementById("product-form");
const productError = document.getElementById("product-error");
const productFormTitle = document.getElementById("product-form-title");
const productsListTitle = document.getElementById("products-list-title");
const pfName = document.getElementById("pf-name");
const pfPrice = document.getElementById("pf-price");
const pfSort = document.getElementById("pf-sort");
const pfActive = document.getElementById("pf-active");
const pfDesc = document.getElementById("pf-desc");
const pfImage = document.getElementById("pf-image");
const pfSubmit = document.getElementById("pf-submit");
const pfCancelEdit = document.getElementById("pf-cancel-edit");
const productEditingId = document.getElementById("product-editing-id");

const brandingForm = document.getElementById("branding-form");
const brandingError = document.getElementById("branding-error");
const bcUploadBtn = document.getElementById("bc-upload-btn");
const bcUploadFile = document.getElementById("bc-upload-file");
const bcUploadTarget = document.getElementById("bc-upload-target");
const bcPrimary = document.getElementById("bc-primary");
const bcPrimaryDark = document.getElementById("bc-primaryDark");
const bcPrimaryPicker = document.getElementById("bc-primaryPicker");
const bcPrimaryDarkPicker = document.getElementById("bc-primaryDarkPicker");
const bcLogoUrl = document.getElementById("bc-logoUrl");
const bcFaviconUrl = document.getElementById("bc-faviconUrl");
const bcHeroBgUrl = document.getElementById("bc-heroBgUrl");
const bcLogoPreview = document.getElementById("bc-logoPreview");
const bcFaviconPreview = document.getElementById("bc-faviconPreview");
const bcHeroPreview = document.getElementById("bc-heroPreview");

const tabUsers = document.getElementById("tab-users");
const adminUsersBody = document.getElementById("admin-users-body");
const adminUsersTable = document.getElementById("admin-users-table");
const adminUsersEmpty = document.getElementById("admin-users-empty");
const adminUsersError = document.getElementById("admin-users-error");
const adminUserForm = document.getElementById("admin-user-form");

let ordersCache = [];
let productsCache = [];
let currentUser = null;
let siteConfig = null;

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) || "";
}
function setToken(token) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}
function authHeaders(json = false) {
  const h = { Accept: "application/json", Authorization: `Bearer ${getToken()}` };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = String(text ?? "");
  return div.innerHTML;
}
function escapeAttr(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}
function toMoney(value) {
  const locale = siteConfig?.locale || "fr-FR";
  const currency = siteConfig?.currency || "EUR";
  return Number(value).toLocaleString(locale, { style: "currency", currency });
}
function showMsg(node, msg) {
  if (!node) return;
  if (!msg) {
    node.classList.add("hidden");
    node.textContent = "";
    return;
  }
  node.classList.remove("hidden");
  node.textContent = msg;
}

function toHexColor(value, fallback = "#000000") {
  const input = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(input)) return input;
  if (/^#[0-9a-fA-F]{3}$/.test(input)) {
    const c = input.slice(1);
    return `#${c[0]}${c[0]}${c[1]}${c[1]}${c[2]}${c[2]}`;
  }
  return fallback;
}

function normalizeBrandingUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const fixed = raw.replaceAll("\\", "/");
  // If user pasted local absolute path, map to public branding folder by filename.
  if (/^[a-zA-Z]:\//.test(fixed)) {
    const parts = fixed.split("/");
    const filename = parts[parts.length - 1];
    return `/assets/branding/${filename}`;
  }
  if (fixed.startsWith("http://") || fixed.startsWith("https://") || fixed.startsWith("/")) {
    return fixed;
  }
  return `/${fixed.replace(/^\/+/, "")}`;
}

function refreshBrandingPreviews() {
  const logo = normalizeBrandingUrl(bcLogoUrl.value);
  const fav = normalizeBrandingUrl(bcFaviconUrl.value);
  const hero = normalizeBrandingUrl(bcHeroBgUrl.value);
  bcLogoPreview.src = logo;
  bcFaviconPreview.src = fav;
  bcHeroPreview.src = hero;
}

function collectBrandingPatch() {
  const primary = toHexColor(bcPrimary.value.trim(), "#16a34a");
  const primaryDark = toHexColor(bcPrimaryDark.value.trim(), primary);
  const logo = normalizeBrandingUrl(bcLogoUrl.value);
  const favicon = normalizeBrandingUrl(bcFaviconUrl.value);
  const heroBg = normalizeBrandingUrl(bcHeroBgUrl.value);

  return {
    patch: {
      siteName: document.getElementById("bc-siteName").value.trim(),
      businessType: document.getElementById("bc-businessType").value,
      locale: document.getElementById("bc-locale").value.trim(),
      currency: document.getElementById("bc-currency").value.trim(),
      theme: {
        primary,
        primaryDark,
        heroGradient: document.getElementById("bc-heroGradient").value.trim(),
        badgeBg: document.getElementById("bc-badgeBg").value.trim(),
      },
      contact: {
        email: document.getElementById("bc-email").value.trim(),
        whatsapp: document.getElementById("bc-whatsapp").value.trim(),
        stripePaymentLink: document.getElementById("bc-stripe").value.trim(),
      },
      images: {
        logo,
        favicon,
        heroBackground: heroBg,
      },
      labels: {
        itemSingular: document.getElementById("bc-itemSingular").value.trim(),
        itemPlural: document.getElementById("bc-itemPlural").value.trim(),
        catalogTitle: document.getElementById("bc-catalogTitle").value.trim(),
        addItemAction: document.getElementById("bc-addItemAction").value.trim(),
      },
      texts: {
        heroTitle: document.getElementById("bc-heroTitle").value.trim(),
        heroLead: document.getElementById("bc-heroLead").value.trim(),
        metaDescription: document.getElementById("bc-metaDesc").value.trim(),
      },
    },
    primary,
    primaryDark,
  };
}

async function saveBrandingConfig(showSuccess = true) {
  const { patch, primary, primaryDark } = collectBrandingPatch();
  const data = await api("/api/branding/admin", {
    method: "PUT",
    headers: authHeaders(true),
    body: JSON.stringify(patch),
  });
  siteConfig = data.config;
  bcPrimary.value = primary;
  bcPrimaryDark.value = primaryDark;
  bcPrimaryPicker.value = primary;
  bcPrimaryDarkPicker.value = primaryDark;
  applyAdminHeader();
  applyDynamicLabels();
  refreshBrandingPreviews();
  if (showSuccess) showMsg(brandingError, "Configuration enregistrée.");
}

function showLogin(msg) {
  loginSection.classList.remove("hidden");
  dashboard.classList.add("hidden");
  logoutBtn.classList.add("hidden");
  showMsg(loginError, msg || "");
}
function showDashboard() {
  loginSection.classList.add("hidden");
  dashboard.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");
}

async function api(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, options);
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    setToken("");
    showLogin("Session expirée. Reconnectez-vous.");
    throw new Error("401");
  }
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data;
}

function activeLabels() {
  return siteConfig?.labels || {};
}

function applyAdminHeader() {
  const adm = siteConfig?.admin || {};
  const site = siteConfig?.siteName || "Commerce";
  document.title = `${adm.pageTitle || "Administration"} — ${site}`;
  const h = document.getElementById("br-admin-header");
  if (h) h.textContent = `${site} — ${adm.headerTitle || "Administration"}`;
}

function applyDynamicLabels() {
  const l = activeLabels();
  const singular = l.itemSingular || "article";
  const plural = l.itemPlural || "articles";
  document.getElementById("tab-products").textContent = l.catalogTitle || "Catalogue";
  productFormTitle.textContent = `${l.addItemAction || "Ajouter"} ${singular}`;
  productsListTitle.textContent = l.catalogTitle || "Catalogue";
  productsEmpty.textContent = `Aucun ${singular}. Ajoutez-en ci-dessus.`;
  pfSubmit.textContent = l.saveItemAction || "Enregistrer";
  document.getElementById("products-empty").textContent = `Aucun ${singular}. Ajoutez-en ci-dessus.`;
  const legend = document.querySelector("#product-form-title");
  if (legend && !legend.textContent) legend.textContent = `${l.addItemAction || "Ajouter"} ${singular}`;
  const paneOrdersTitle = document.querySelector("#pane-orders h2");
  if (paneOrdersTitle) paneOrdersTitle.textContent = "Commandes";
  const paneProductsBtn = document.getElementById("tab-products");
  if (paneProductsBtn) paneProductsBtn.textContent = l.catalogTitle || `Gestion ${plural}`;
}

function fillBrandingForm(cfg) {
  document.getElementById("bc-siteName").value = cfg.siteName || "";
  document.getElementById("bc-businessType").value = cfg.businessType || "retail";
  document.getElementById("bc-locale").value = cfg.locale || "fr-FR";
  document.getElementById("bc-currency").value = cfg.currency || "EUR";
  bcPrimary.value = cfg.theme?.primary || "";
  bcPrimaryDark.value = cfg.theme?.primaryDark || "";
  bcPrimaryPicker.value = toHexColor(bcPrimary.value || "#16a34a", "#16a34a");
  bcPrimaryDarkPicker.value = toHexColor(bcPrimaryDark.value || "#15803d", "#15803d");
  document.getElementById("bc-heroGradient").value = cfg.theme?.heroGradient || "";
  document.getElementById("bc-badgeBg").value = cfg.theme?.badgeBg || "";
  document.getElementById("bc-email").value = cfg.contact?.email || "";
  document.getElementById("bc-whatsapp").value = cfg.contact?.whatsapp || "";
  document.getElementById("bc-stripe").value = cfg.contact?.stripePaymentLink || "";
  bcLogoUrl.value = cfg.images?.logo || "";
  bcFaviconUrl.value = cfg.images?.favicon || "";
  bcHeroBgUrl.value = cfg.images?.heroBackground || "";
  document.getElementById("bc-itemSingular").value = cfg.labels?.itemSingular || "";
  document.getElementById("bc-itemPlural").value = cfg.labels?.itemPlural || "";
  document.getElementById("bc-catalogTitle").value = cfg.labels?.catalogTitle || "";
  document.getElementById("bc-addItemAction").value = cfg.labels?.addItemAction || "";
  document.getElementById("bc-heroTitle").value = cfg.texts?.heroTitle || "";
  document.getElementById("bc-heroLead").value = cfg.texts?.heroLead || "";
  document.getElementById("bc-metaDesc").value = cfg.texts?.metaDescription || "";
  refreshBrandingPreviews();
}

async function loadConfigAdmin() {
  const data = await api("/api/branding/admin", { headers: authHeaders() });
  siteConfig = data.config;
  applyAdminHeader();
  applyDynamicLabels();
  fillBrandingForm(siteConfig);
}

async function loadOrders() {
  showMsg(ordersError, "");
  try {
    const data = await api("/api/orders", { headers: authHeaders() });
    ordersCache = data.orders || [];
    ordersBody.innerHTML = "";
    if (!ordersCache.length) {
      ordersTable.classList.add("hidden");
      ordersEmpty.classList.remove("hidden");
      return;
    }
    ordersTable.classList.remove("hidden");
    ordersEmpty.classList.add("hidden");
    ordersCache.forEach((order) => {
      const tr = document.createElement("tr");
      const itemsText = order.items.map((it) => `${it.label} x${it.qty}`).join(", ");
      tr.innerHTML = `
        <td>${escapeHtml(order.id)}</td>
        <td>${new Date(order.createdAt).toLocaleString(siteConfig?.locale || "fr-FR")}</td>
        <td>${escapeHtml(order.customer.name)}<br />${escapeHtml(order.customer.phone)}<br />${escapeHtml(order.customer.email)}</td>
        <td>${escapeHtml(itemsText)}</td>
        <td>${toMoney(order.total)}</td>
        <td>${escapeHtml(order.paymentMethod)}</td>
        <td>
          <select data-action="status" data-id="${order._id}">
            <option value="nouvelle" ${order.status === "nouvelle" ? "selected" : ""}>Nouvelle</option>
            <option value="confirmee" ${order.status === "confirmee" ? "selected" : ""}>Confirmée</option>
            <option value="livree" ${order.status === "livree" ? "selected" : ""}>Livrée</option>
            <option value="annulee" ${order.status === "annulee" ? "selected" : ""}>Annulée</option>
          </select>
        </td>
        <td><button class="btn btn-secondary" data-action="delete" data-id="${order._id}">Supprimer</button></td>
      `;
      ordersBody.appendChild(tr);
    });
  } catch (e) {
    if (e.message !== "401") showMsg(ordersError, e.message);
  }
}

ordersBody.addEventListener("change", async (e) => {
  const t = e.target;
  if (!(t instanceof HTMLSelectElement) || t.dataset.action !== "status") return;
  try {
    await api(`/api/orders/${t.dataset.id}`, {
      method: "PATCH",
      headers: authHeaders(true),
      body: JSON.stringify({ status: t.value }),
    });
    await loadOrders();
  } catch (err) {
    if (err.message !== "401") showMsg(ordersError, err.message);
  }
});
ordersBody.addEventListener("click", async (e) => {
  const t = e.target;
  if (!(t instanceof HTMLButtonElement) || t.dataset.action !== "delete") return;
  try {
    await fetch(`${API_BASE}/api/orders/${t.dataset.id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    await loadOrders();
  } catch {
    showMsg(ordersError, "Suppression impossible.");
  }
});
clearBtn.addEventListener("click", async () => {
  if (!confirm("Supprimer toutes les commandes ?")) return;
  try {
    await fetch(`${API_BASE}/api/orders`, { method: "DELETE", headers: authHeaders() });
    await loadOrders();
  } catch {
    showMsg(ordersError, "Suppression globale impossible.");
  }
});
refreshBtn.addEventListener("click", () => loadOrders());
exportBtn.addEventListener("click", () => {
  if (!ordersCache.length) return;
  const rows = [
    ["id", "date", "nom", "telephone", "email", "adresse", "articles", "total", "paiement", "statut", "notes"],
    ...ordersCache.map((o) => [
      o.id,
      new Date(o.createdAt).toISOString(),
      o.customer.name,
      o.customer.phone,
      o.customer.email,
      o.customer.address,
      o.items.map((it) => `${it.label} x${it.qty}`).join(" | "),
      o.total,
      o.paymentMethod,
      o.status,
      o.notes || "",
    ]),
  ];
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "commandes.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});

function resetProductForm() {
  const l = activeLabels();
  productEditingId.value = "";
  productFormTitle.textContent = `${l.addItemAction || "Ajouter"} ${l.itemSingular || "article"}`;
  pfSubmit.textContent = l.saveItemAction || "Enregistrer";
  pfCancelEdit.classList.add("hidden");
  pfName.value = "";
  pfDesc.value = "";
  pfPrice.value = "";
  pfSort.value = "0";
  pfActive.checked = true;
  pfImage.value = "";
  showMsg(productError, "");
}
pfCancelEdit.addEventListener("click", resetProductForm);

async function loadProducts() {
  productsLoading.classList.remove("hidden");
  productsEmpty.classList.add("hidden");
  productsTable.classList.add("hidden");
  productsBody.innerHTML = "";
  showMsg(productError, "");
  try {
    const data = await api("/api/products", { headers: authHeaders() });
    productsCache = data.products || [];
    productsLoading.classList.add("hidden");
    if (!productsCache.length) {
      productsEmpty.classList.remove("hidden");
      return;
    }
    productsTable.classList.remove("hidden");
    productsCache.forEach((p) => {
      const tr = document.createElement("tr");
      const thumb = p.imageUrl
        ? `<img class="product-thumb" src="${escapeAttr(p.imageUrl)}" alt="" />`
        : `<span class="product-thumb product-thumb--empty">—</span>`;
      tr.innerHTML = `
        <td>${thumb}</td>
        <td>${escapeHtml(p.name)}</td>
        <td>${toMoney(p.price)}</td>
        <td>${p.active ? "Oui" : "Non"}</td>
        <td>${p.sortOrder}</td>
        <td>
          <button type="button" class="btn btn-secondary" data-edit="${escapeAttr(p._id)}">Modifier</button>
          <button type="button" class="btn btn-secondary" data-del="${escapeAttr(p._id)}">Supprimer</button>
        </td>
      `;
      productsBody.appendChild(tr);
    });
  } catch (e) {
    productsLoading.classList.add("hidden");
    if (e.message !== "401") showMsg(productError, e.message);
  }
}

productsBody.addEventListener("click", async (e) => {
  const t = e.target;
  if (!(t instanceof HTMLButtonElement)) return;
  const editId = t.getAttribute("data-edit");
  const delId = t.getAttribute("data-del");
  if (editId) {
    const row = productsCache.find((x) => x._id === editId);
    if (!row) return;
    const l = activeLabels();
    productEditingId.value = row._id;
    productFormTitle.textContent = `${l.editItemAction || "Modifier"} ${l.itemSingular || "article"}`;
    pfSubmit.textContent = l.saveItemAction || "Enregistrer";
    pfCancelEdit.classList.remove("hidden");
    pfName.value = row.name;
    pfDesc.value = row.description || "";
    pfPrice.value = String(row.price);
    pfSort.value = String(row.sortOrder ?? 0);
    pfActive.checked = !!row.active;
    pfImage.value = "";
    return;
  }
  if (delId) {
    if (!confirm("Supprimer cet élément ?")) return;
    try {
      await fetch(`${API_BASE}/api/products/${delId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      await loadProducts();
    } catch {
      showMsg(productError, "Suppression impossible.");
    }
  }
});

productForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const edit = productEditingId.value.trim();
  const fd = new FormData();
  fd.append("name", pfName.value.trim());
  fd.append("description", pfDesc.value.trim());
  fd.append("price", pfPrice.value);
  fd.append("sortOrder", pfSort.value || "0");
  fd.append("active", pfActive.checked ? "true" : "false");
  if (pfImage.files && pfImage.files[0]) fd.append("image", pfImage.files[0]);
  try {
    const res = await fetch(`${API_BASE}/api/products${edit ? `/${edit}` : ""}`, {
      method: edit ? "PATCH" : "POST",
      headers: { Accept: "application/json", Authorization: `Bearer ${getToken()}` },
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
    resetProductForm();
    await loadProducts();
  } catch (err) {
    showMsg(productError, err.message);
  }
});

brandingForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await saveBrandingConfig(true);
  } catch (err) {
    if (err.message !== "401") showMsg(brandingError, err.message);
  }
});

bcUploadBtn.addEventListener("click", async () => {
  if (!bcUploadFile.files || !bcUploadFile.files[0]) {
    showMsg(brandingError, "Choisissez un fichier à uploader.");
    return;
  }
  try {
    const fd = new FormData();
    fd.append("image", bcUploadFile.files[0]);
    const res = await fetch(`${API_BASE}/api/branding/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` },
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
    const target = bcUploadTarget.value;
    if (target === "logo") bcLogoUrl.value = data.imageUrl;
    if (target === "favicon") bcFaviconUrl.value = data.imageUrl;
    if (target === "heroBackground") bcHeroBgUrl.value = data.imageUrl;
    refreshBrandingPreviews();
    await saveBrandingConfig(false);
    showMsg(brandingError, `Upload réussi (${target}) et appliqué.`);
  } catch (err) {
    showMsg(brandingError, err.message);
  }
});

bcPrimaryPicker.addEventListener("input", () => {
  bcPrimary.value = bcPrimaryPicker.value;
});
bcPrimaryDarkPicker.addEventListener("input", () => {
  bcPrimaryDark.value = bcPrimaryDarkPicker.value;
});
bcPrimary.addEventListener("input", () => {
  bcPrimaryPicker.value = toHexColor(bcPrimary.value, bcPrimaryPicker.value);
});
bcPrimaryDark.addEventListener("input", () => {
  bcPrimaryDarkPicker.value = toHexColor(bcPrimaryDark.value, bcPrimaryDarkPicker.value);
});
bcLogoUrl.addEventListener("input", refreshBrandingPreviews);
bcFaviconUrl.addEventListener("input", refreshBrandingPreviews);
bcHeroBgUrl.addEventListener("input", refreshBrandingPreviews);

function showUsersPaneIfOwner() {
  tabUsers.classList.toggle("hidden", currentUser?.role !== "owner");
}

async function loadAdminUsers() {
  if (currentUser?.role !== "owner") return;
  showMsg(adminUsersError, "");
  try {
    const data = await api("/api/admin-users", { headers: authHeaders() });
    const users = data.users || [];
    adminUsersBody.innerHTML = "";
    if (!users.length) {
      adminUsersTable.classList.add("hidden");
      adminUsersEmpty.classList.remove("hidden");
      return;
    }
    adminUsersTable.classList.remove("hidden");
    adminUsersEmpty.classList.add("hidden");
    users.forEach((u) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(u.username)}</td>
        <td>
          <select data-role-id="${u.id}">
            <option value="owner" ${u.role === "owner" ? "selected" : ""}>owner</option>
            <option value="manager" ${u.role === "manager" ? "selected" : ""}>manager</option>
            <option value="editor" ${u.role === "editor" ? "selected" : ""}>editor</option>
          </select>
        </td>
        <td><input type="checkbox" data-active-id="${u.id}" ${u.active ? "checked" : ""} /></td>
        <td><button class="btn btn-secondary" data-reset-id="${u.id}">Reset mdp</button></td>
      `;
      adminUsersBody.appendChild(tr);
    });
  } catch (err) {
    if (err.message !== "401") showMsg(adminUsersError, err.message);
  }
}

adminUserForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const username = document.getElementById("au-username").value.trim();
    const password = document.getElementById("au-password").value;
    const role = document.getElementById("au-role").value;
    await api("/api/admin-users", {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify({ username, password, role }),
    });
    adminUserForm.reset();
    await loadAdminUsers();
  } catch (err) {
    if (err.message !== "401") showMsg(adminUsersError, err.message);
  }
});

adminUsersBody.addEventListener("change", async (e) => {
  const t = e.target;
  if (!(t instanceof HTMLElement)) return;
  const roleId = t.getAttribute("data-role-id");
  const activeId = t.getAttribute("data-active-id");
  if (roleId && t instanceof HTMLSelectElement) {
    await api(`/api/admin-users/${roleId}`, {
      method: "PATCH",
      headers: authHeaders(true),
      body: JSON.stringify({ role: t.value }),
    });
  }
  if (activeId && t instanceof HTMLInputElement) {
    await api(`/api/admin-users/${activeId}`, {
      method: "PATCH",
      headers: authHeaders(true),
      body: JSON.stringify({ active: t.checked }),
    });
  }
});

adminUsersBody.addEventListener("click", async (e) => {
  const t = e.target;
  if (!(t instanceof HTMLButtonElement)) return;
  const id = t.getAttribute("data-reset-id");
  if (!id) return;
  const pwd = prompt("Nouveau mot de passe :");
  if (!pwd) return;
  await api(`/api/admin-users/${id}`, {
    method: "PATCH",
    headers: authHeaders(true),
    body: JSON.stringify({ password: pwd }),
  });
  showMsg(adminUsersError, "Mot de passe mis à jour.");
});

document.querySelectorAll(".admin-tab").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const tab = btn.getAttribute("data-tab");
    document.querySelectorAll(".admin-tab").forEach((b) => b.classList.toggle("admin-tab--active", b === btn));
    ["orders", "products", "branding", "users"].forEach((name) => {
      const pane = document.getElementById(`pane-${name}`);
      if (pane) pane.classList.toggle("hidden", name !== tab);
    });
    if (tab === "orders") await loadOrders();
    if (tab === "products") await loadProducts();
    if (tab === "branding") await loadConfigAdmin();
    if (tab === "users") await loadAdminUsers();
  });
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const fd = new FormData(loginForm);
    const username = String(fd.get("username") || "").trim();
    const password = String(fd.get("password") || "");
    const data = await api("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setToken(data.token);
    currentUser = data.user || null;
    showUsersPaneIfOwner();
    showDashboard();
    await loadConfigAdmin();
    await loadOrders();
  } catch (err) {
    showMsg(loginError, err.message === "401" ? "Identifiants invalides." : err.message);
  }
});

logoutBtn.addEventListener("click", () => {
  setToken("");
  currentUser = null;
  showLogin();
});

async function boot() {
  try {
    const branding = await fetch(`${API_BASE}/api/branding`).then((r) => r.json());
    siteConfig = branding;
    applyAdminHeader();
    applyDynamicLabels();
  } catch {
    // no-op
  }
  if (!getToken()) {
    showLogin();
    return;
  }
  try {
    const me = await api("/api/auth/me", { headers: authHeaders() });
    currentUser = me.user;
    showUsersPaneIfOwner();
    showDashboard();
    await loadConfigAdmin();
    await loadOrders();
  } catch {
    showLogin("Session invalide.");
  }
}

boot();
