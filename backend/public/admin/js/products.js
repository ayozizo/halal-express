function clearProdForm() {
  state.prodEditingId = null;
  qs('prod-editing').textContent = '(new)';
  qs('prod-name').value = '';
  qs('prod-description').value = '';
  qs('prod-imageUrl').value = '';
  qs('prod-imagePreview').style.display = 'none';
  qs('prod-imagePreview').src = '';
  qs('prod-price').value = '0';
  qs('prod-available').value = 'true';
  qs('prod-options').value = '[]';
}

function setProdImagePreview(url) {
  const img = qs('prod-imagePreview');
  const u = (url || '').trim();
  if (!u) {
    img.style.display = 'none';
    img.src = '';
    return;
  }
  img.style.display = 'block';
  img.src = u;
}

function parseOptionsJson(value) {
  if (!value.trim()) return [];
  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed)) throw new Error('Options JSON must be an array');
  return parsed;
}

async function loadProdCategories() {
  const topCats = await apiFetch('/admin/categories');
  state.prodTopCats = topCats;

  const sel = qs('prod-category');
  sel.innerHTML = '';
  topCats.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    sel.appendChild(opt);
  });

  if (!state.prodCategoryId && topCats[0]) state.prodCategoryId = topCats[0].id;
  sel.value = state.prodCategoryId;
}

async function loadProdSubcategories(catId) {
  const subs = await apiFetch(`/admin/categories?parentId=${encodeURIComponent(catId)}`);
  state.prodSubCats = subs;

  const sel = qs('prod-subcategory');
  sel.innerHTML = '';

  const opt0 = document.createElement('option');
  opt0.value = '';
  opt0.textContent = 'Select...';
  sel.appendChild(opt0);

  subs.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    sel.appendChild(opt);
  });

  if (!state.prodSubCategoryId && subs[0]) state.prodSubCategoryId = subs[0].id;
  sel.value = state.prodSubCategoryId;
}

async function loadProducts() {
  const tbody = qs('prod-tbody');
  tbody.innerHTML = '';
  if (!state.prodSubCategoryId) return;

  const items = await apiFetch(`/admin/products?subCategoryId=${encodeURIComponent(state.prodSubCategoryId)}`);

  items.forEach((p) => {
    const tr = document.createElement('tr');

    const tdImg = document.createElement('td');
    tdImg.className = 'image-cell';
    if (p.imageUrl) {
      const img = document.createElement('img');
      img.className = 'prod-thumb';
      img.src = p.imageUrl;
      img.alt = '';
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      img.onerror = () => {
        img.remove();
        tdImg.textContent = '-';
      };
      tdImg.appendChild(img);
    } else {
      tdImg.textContent = '-';
    }

    const tdName = document.createElement('td');
    tdName.textContent = p.name;

    const tdPrice = document.createElement('td');
    tdPrice.textContent = p.basePrice;

    const tdAvail = document.createElement('td');
    tdAvail.textContent = String(p.isAvailable);

    const tdActions = document.createElement('td');
    tdActions.className = 'actions-cell';

    const btnEdit = document.createElement('button');
    btnEdit.className = 'btn secondary small';
    btnEdit.textContent = 'Edit';
    btnEdit.onclick = () => {
      state.prodEditingId = p.id;
      qs('prod-editing').textContent = p.id;
      qs('prod-name').value = p.name || '';
      qs('prod-description').value = p.description || '';
      qs('prod-imageUrl').value = p.imageUrl || '';
      setProdImagePreview(p.imageUrl || '');
      qs('prod-price').value = String(p.basePrice || '0');
      qs('prod-available').value = String(Boolean(p.isAvailable));
      qs('prod-options').value = JSON.stringify(p.optionsJson || [], null, 2);
    };

    const btnDelete = document.createElement('button');
    btnDelete.className = 'btn danger small';
    btnDelete.textContent = 'Delete';
    btnDelete.onclick = async () => {
      if (!confirm('Delete product?')) return;
      try {
        await apiFetch(`/products/${p.id}`, { method: 'DELETE' });
        showToast('success', 'Deleted');
        await loadProducts();
      } catch (e) {
        showToast('error', e.message);
      }
    };

    tdActions.appendChild(btnEdit);
    tdActions.appendChild(btnDelete);

    tr.appendChild(tdImg);
    tr.appendChild(tdName);
    tr.appendChild(tdPrice);
    tr.appendChild(tdAvail);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });
}

async function saveProduct() {
  const name = qs('prod-name').value.trim();
  const description = qs('prod-description').value.trim();
  const imageUrl = qs('prod-imageUrl').value.trim();
  const basePrice = Number(qs('prod-price').value || 0);
  const isAvailable = qs('prod-available').value === 'true';

  if (!name) return showToast('error', 'Name is required');
  if (!state.prodCategoryId || !state.prodSubCategoryId) return showToast('error', 'Select category and subcategory');

  let options;
  try {
    options = parseOptionsJson(qs('prod-options').value);
  } catch (e) {
    return showToast('error', e.message);
  }

  const body = {
    name,
    description: description ? description : null,
    imageUrl: imageUrl ? imageUrl : null,
    basePrice,
    isAvailable,
    options,
    categoryId: state.prodCategoryId,
    subCategoryId: state.prodSubCategoryId,
  };

  try {
    if (state.prodEditingId) {
      await apiFetch(`/products/${state.prodEditingId}`, { method: 'PUT', body: JSON.stringify(body) });
      showToast('success', 'Updated');
    } else {
      await apiFetch('/products', { method: 'POST', body: JSON.stringify(body) });
      showToast('success', 'Created');
    }

    clearProdForm();
    await loadProducts();
  } catch (e) {
    showToast('error', e.message);
  }
}

async function showProducts() {
  showView('view-products');
  qs('prod-error').style.display = 'none';

  const imageUrlEl = qs('prod-imageUrl');
  if (imageUrlEl) {
    imageUrlEl.oninput = (e) => setProdImagePreview(e.target.value);
    setProdImagePreview(imageUrlEl.value);
  }

  try {
    await loadProdCategories();
    await loadProdSubcategories(state.prodCategoryId);
    await loadProducts();
  } catch (e) {
    qs('prod-error').textContent = e.message;
    qs('prod-error').style.display = 'block';
  }
}
