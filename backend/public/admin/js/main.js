async function loadMe() {
  try {
    const me = await apiFetch('/auth/me');
    if (!me.isAdmin) throw new Error('Forbidden');
    state.me = me;
    qs('topbar-user').textContent = me.email;
    qs('btn-logout').style.display = 'inline-flex';
    return true;
  } catch {
    state.me = null;
    qs('topbar-user').textContent = '';
    qs('btn-logout').style.display = 'none';
    return false;
  }
}

async function onLoginSubmit(e) {
  e.preventDefault();
  qs('login-error').style.display = 'none';

  const email = qs('login-email').value.trim();
  const password = qs('login-password').value;

  try {
    const me = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (!me.isAdmin) throw new Error('Not an admin user');

    state.me = me;
    qs('topbar-user').textContent = me.email;
    qs('btn-logout').style.display = 'inline-flex';
    showToast('success', 'Logged in');
    location.hash = '#/dashboard';
  } catch (err) {
    qs('login-error').textContent = err.message;
    qs('login-error').style.display = 'block';
  }
}

async function logout() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch {
    // ignore
  }
  state.me = null;
  location.hash = '#/dashboard';
  route();
}

function bindEvents() {
  qs('login-form').addEventListener('submit', onLoginSubmit);
  qs('btn-logout').addEventListener('click', logout);

  // categories
  qs('cat-back').addEventListener('click', () => {
    if (state.catStack.length > 1) state.catStack.pop();
    state.catEditingId = null;
    clearCatForm();
    showCategories();
  });
  qs('cat-refresh').addEventListener('click', () => loadCategories().catch((e) => showToast('error', e.message)));
  qs('cat-save').addEventListener('click', () => saveCategory());
  qs('cat-clear').addEventListener('click', () => clearCatForm());

  // products
  qs('prod-category').addEventListener('change', async (e) => {
    state.prodCategoryId = e.target.value;
    state.prodSubCategoryId = '';
    await loadProdSubcategories(state.prodCategoryId);
    await loadProducts();
  });
  qs('prod-subcategory').addEventListener('change', async (e) => {
    state.prodSubCategoryId = e.target.value;
    await loadProducts();
  });
  qs('prod-refresh').addEventListener('click', async () => {
    await loadProducts();
    showToast('success', 'Refreshed');
  });
  qs('prod-save').addEventListener('click', () => saveProduct());
  qs('prod-clear').addEventListener('click', () => clearProdForm());

  // orders
  qs('orders-refresh').addEventListener('click', () => loadOrders().catch((e) => showToast('error', e.message)));

  // delivery
  qs('zones-refresh').addEventListener('click', () => loadZones().catch((e) => showToast('error', e.message)));
  qs('couriers-refresh').addEventListener('click', () => loadCouriers().catch((e) => showToast('error', e.message)));
  qs('zone-save').addEventListener('click', () => saveZone());
  qs('zone-clear').addEventListener('click', () => clearZoneForm());
  qs('courier-save').addEventListener('click', () => saveCourier());
  qs('courier-clear').addEventListener('click', () => clearCourierForm());

  // payments
  qs('payments-refresh').addEventListener('click', () => loadPayments().catch((e) => showToast('error', e.message)));

  // invoices
  qs('inv-refresh').addEventListener('click', () => loadInvoices().catch((e) => showToast('error', e.message)));

  // users
  qs('users-refresh').addEventListener('click', () => loadUsers().catch((e) => showToast('error', e.message)));
}

async function init() {
  bindEvents();
  await loadMe();
  window.addEventListener('hashchange', route);
  route();
}

init().catch((e) => {
  showToast('error', e.message || 'Init failed');
});
