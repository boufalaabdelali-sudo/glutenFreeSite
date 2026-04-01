const API_BASE = "";
const TOKEN_KEY = "sg_jwt_token";

const loginSection = document.getElementById("login-section");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const dashboard = document.getElementById("dashboard");
const logoutBtn = document.getElementById("logout-btn");

const body = document.getElementById("orders-body");
const table = document.getElementById("orders-table");
const empty = document.getElementById("admin-empty");
const exportBtn = document.getElementById("export-btn");
const clearBtn = document.getElementById("clear-btn");
const refreshBtn = document.getElementById("refresh-btn");
const adminError = document.getElementById("admin-error");

const productsBody = document.getElementById("products-body");
const productsTable = document.getElementById("products-table");
const productsEmpty = document.getElementById("products-empty");
const productsLoading = document.getElementById("products-loading");
const productForm = document.getElementById("product-form");
const productError = document.getElementById("product-error");
const productFormTitle = document.getElementById("product-form-title");
const pfName = document.getElementById("pf-name");
const pfPrice = document.getElementById("pf-price");
const pfSort = document.getElementById("pf-sort");
const pfActive = document.getElementById("pf-active");
const pfDesc = document.getElementById("pf-desc");
const pfImage = document.getElementById("pf-image");
const pfSubmit = document.getElementById("pf-submit");
const pfCancelEdit = document.getElementById("pf-cancel-edit");
const productEditingId = document.getElementById("product-editing-id");

let ordersCache = [];
let productsCache = [];

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) || "";
}

function setToken(t) {
  if (t) sessionStorage.setItem(TOKEN_KEY, t);
  else sessionStorage.removeItem(TOKEN_KEY);
}

function authHeaders(json = false) {
  const h = { Accept: "application/json", Authorization: `Bearer ${getToken()}` };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

function showLogin(msg) {
  loginSection.classList.remove("hidden");
  dashboard.classList.add("hidden");
  logoutBtn.classList.add("hidden");
  if (msg) {
    loginError.classList.remove("hidden");
    loginError.textContent = msg;
  } else {
    loginError.classList.add("hidden");
    loginError.textContent = "";
  }
}

function showDashboard() {
  loginSection.classList.add("hidden");
  dashboard.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");
  loadOrders();
}

function toEuro(value) {
  return Number(value).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showError(msg) {
  if (!msg) {
    adminError.classList.add("hidden");
    adminError.textContent = "";
    return;
  }
  adminError.classList.remove("hidden");
  adminError.textContent = msg;
}

async function fetchOrders() {
  showError("");
  const res = await fetch(`${API_BASE}/api/orders`, { headers: authHeaders() });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    setToken("");
    showLogin("Session expiree. Reconnectez-vous.");
    throw new Error("401");
  }
  if (!res.ok) {
    throw new Error(data.error || `Erreur ${res.status}`);
  }
  return data.orders || [];
}

function renderOrders() {
  body.innerHTML = "";

  if (!ordersCache.length) {
    table.classList.add("hidden");
    empty.classList.remove("hidden");
    return;
  }

  table.classList.remove("hidden");
  empty.classList.add("hidden");

  ordersCache.forEach((order) => {
    const tr = document.createElement("tr");
    const itemsText = order.items.map((item) => `${item.label} x${item.qty}`).join(", ");
    const mongoId = order._id;
    tr.innerHTML = `
      <td>${escapeHtml(order.id)}</td>
      <td>${new Date(order.createdAt).toLocaleString("fr-FR")}</td>
      <td>${escapeHtml(order.customer.name)}<br />${escapeHtml(order.customer.phone)}<br />${escapeHtml(order.customer.email)}</td>
      <td>${escapeHtml(itemsText)}</td>
      <td>${toEuro(order.total)}</td>
      <td>${escapeHtml(order.paymentMethod)}</td>
      <td>
        <select data-action="status" data-mongo-id="${mongoId}">
          <option value="nouvelle" ${order.status === "nouvelle" ? "selected" : ""}>Nouvelle</option>
          <option value="confirmee" ${order.status === "confirmee" ? "selected" : ""}>Confirmee</option>
          <option value="livree" ${order.status === "livree" ? "selected" : ""}>Livree</option>
          <option value="annulee" ${order.status === "annulee" ? "selected" : ""}>Annulee</option>
        </select>
      </td>
      <td><button class="btn btn-secondary" data-action="delete" data-mongo-id="${mongoId}">Supprimer</button></td>
    `;
    body.appendChild(tr);
  });
}

async function loadOrders() {
  try {
    ordersCache = await fetchOrders();
    renderOrders();
  } catch (e) {
    if (e.message === "401") return;
    showError(e.message || "Erreur de chargement.");
    ordersCache = [];
    renderOrders();
  }
}

body.addEventListener("change", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) return;
  if (target.dataset.action !== "status") return;
  const id = target.dataset.mongoId;
  showError("");
  try {
    const res = await fetch(`${API_BASE}/api/orders/${id}`, {
      method: "PATCH",
      headers: authHeaders(true),
      body: JSON.stringify({ status: target.value }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      setToken("");
      showLogin("Session expiree.");
      return;
    }
    if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
    await loadOrders();
  } catch (e) {
    showError(e.message || "Mise a jour impossible.");
    await loadOrders();
  }
});

body.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  if (target.dataset.action !== "delete") return;
  const id = target.dataset.mongoId;
  showError("");
  try {
    const res = await fetch(`${API_BASE}/api/orders/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (res.status === 401) {
      setToken("");
      showLogin("Session expiree.");
      return;
    }
    if (!res.ok && res.status !== 204) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Erreur ${res.status}`);
    }
    await loadOrders();
  } catch (e) {
    showError(e.message || "Suppression impossible.");
    await loadOrders();
  }
});

clearBtn.addEventListener("click", async () => {
  if (!confirm("Supprimer toutes les commandes en base ?")) return;
  showError("");
  try {
    const res = await fetch(`${API_BASE}/api/orders`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (res.status === 401) {
      setToken("");
      showLogin("Session expiree.");
      return;
    }
    if (!res.ok && res.status !== 204) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Erreur ${res.status}`);
    }
    await loadOrders();
  } catch (e) {
    showError(e.message || "Suppression globale impossible.");
  }
});

exportBtn.addEventListener("click", () => {
  if (!ordersCache.length) return;

  const rows = [
    ["id", "date", "nom", "telephone", "email", "adresse", "plats", "total", "paiement", "statut", "notes"],
    ...ordersCache.map((order) => [
      order.id,
      new Date(order.createdAt).toISOString(),
      order.customer.name,
      order.customer.phone,
      order.customer.email,
      order.customer.address,
      order.items.map((item) => `${item.label} x${item.qty}`).join(" | "),
      order.total,
      order.paymentMethod,
      order.status,
      order.notes || "",
    ]),
  ];

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "commandes-sans-gluten.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});

refreshBtn.addEventListener("click", () => loadOrders());

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(loginForm);
  const username = String(fd.get("username") || "").trim();
  const password = String(fd.get("password") || "");
  loginError.classList.add("hidden");
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      loginError.classList.remove("hidden");
      loginError.textContent = data.error || "Connexion refusee.";
      return;
    }
    setToken(data.token);
    showDashboard();
  } catch {
    loginError.classList.remove("hidden");
    loginError.textContent = "Impossible de contacter le serveur.";
  }
});

logoutBtn.addEventListener("click", () => {
  setToken("");
  showLogin();
});

document.querySelectorAll(".admin-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.getAttribute("data-tab");
    document.querySelectorAll(".admin-tab").forEach((b) => {
      b.classList.toggle("admin-tab--active", b === btn);
    });
    document.getElementById("pane-orders").classList.toggle("hidden", tab !== "orders");
    document.getElementById("pane-products").classList.toggle("hidden", tab !== "products");
    if (tab === "products") loadProducts();
  });
});

function showProductError(msg) {
  if (!msg) {
    productError.classList.add("hidden");
    productError.textContent = "";
    return;
  }
  productError.classList.remove("hidden");
  productError.textContent = msg;
}

function resetProductForm() {
  productEditingId.value = "";
  productFormTitle.textContent = "Ajouter un plat";
  pfSubmit.textContent = "Enregistrer le plat";
  pfCancelEdit.classList.add("hidden");
  pfName.value = "";
  pfDesc.value = "";
  pfPrice.value = "";
  pfSort.value = "0";
  pfActive.checked = true;
  pfImage.value = "";
  showProductError("");
}

pfCancelEdit.addEventListener("click", () => resetProductForm());

async function loadProducts() {
  productsLoading.classList.remove("hidden");
  productsEmpty.classList.add("hidden");
  productsTable.classList.add("hidden");
  productsBody.innerHTML = "";
  showProductError("");
  try {
    const res = await fetch(`${API_BASE}/api/products`, { headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      setToken("");
      showLogin("Session expiree.");
      return;
    }
    if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
    const products = data.products || [];
    productsCache = products;
    productsLoading.classList.add("hidden");
    if (!products.length) {
      productsEmpty.classList.remove("hidden");
      return;
    }
    productsTable.classList.remove("hidden");
    products.forEach((p) => {
      const tr = document.createElement("tr");
      const thumb = p.imageUrl
        ? `<img class="product-thumb" src="${escapeAttr(p.imageUrl)}" alt="" />`
        : `<span class="product-thumb product-thumb--empty">—</span>`;
      tr.innerHTML = `
        <td>${thumb}</td>
        <td>${escapeHtml(p.name)}</td>
        <td>${toEuro(p.price)}</td>
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
    productsCache = [];
    productsLoading.classList.add("hidden");
    showProductError(e.message || "Chargement impossible.");
  }
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

productsBody.addEventListener("click", async (e) => {
  const target = e.target;
  if (!(target instanceof HTMLButtonElement)) return;
  const editId = target.getAttribute("data-edit");
  const delId = target.getAttribute("data-del");
  if (editId) {
    const row = productsCache.find((x) => x._id === editId);
    if (!row) return;
    productEditingId.value = row._id;
    productFormTitle.textContent = "Modifier le plat";
    pfSubmit.textContent = "Enregistrer les modifications";
    pfCancelEdit.classList.remove("hidden");
    pfName.value = row.name;
    pfDesc.value = row.description || "";
    pfPrice.value = String(row.price);
    pfSort.value = String(row.sortOrder ?? 0);
    pfActive.checked = !!row.active;
    pfImage.value = "";
    productForm.scrollIntoView({ behavior: "smooth" });
    return;
  }
  if (delId) {
    if (!confirm("Supprimer ce plat ? Les anciennes commandes conservent le libelle enregistre.")) return;
    showProductError("");
    try {
      const res = await fetch(`${API_BASE}/api/products/${delId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.status === 401) {
        setToken("");
        showLogin("Session expiree.");
        return;
      }
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Erreur ${res.status}`);
      }
      resetProductForm();
      await loadProducts();
    } catch (err) {
      showProductError(err.message || "Suppression impossible.");
    }
  }
});

productForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  showProductError("");
  const editing = productEditingId.value.trim();
  const fd = new FormData();
  fd.append("name", pfName.value.trim());
  fd.append("description", pfDesc.value.trim());
  fd.append("price", pfPrice.value);
  fd.append("sortOrder", pfSort.value || "0");
  fd.append("active", pfActive.checked ? "true" : "false");
  if (pfImage.files && pfImage.files[0]) {
    fd.append("image", pfImage.files[0]);
  }

  const url = editing ? `${API_BASE}/api/products/${editing}` : `${API_BASE}/api/products`;
  const method = editing ? "PATCH" : "POST";

  pfSubmit.disabled = true;
  try {
    const res = await fetch(url, {
      method,
      headers: { Accept: "application/json", Authorization: `Bearer ${getToken()}` },
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      setToken("");
      showLogin("Session expiree.");
      return;
    }
    if (!res.ok) {
      throw new Error(data.error || `Erreur ${res.status}`);
    }
    resetProductForm();
    await loadProducts();
  } catch (err) {
    showProductError(err.message || "Enregistrement impossible.");
  } finally {
    pfSubmit.disabled = false;
  }
});

async function boot() {
  if (!getToken()) {
    showLogin();
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/api/orders`, { headers: authHeaders() });
    if (res.status === 401) {
      setToken("");
      showLogin();
      return;
    }
    showDashboard();
  } catch {
    showLogin("Serveur inaccessible.");
  }
}

boot();
