function catCurrentParentId() {
  return state.catStack[state.catStack.length - 1].parentId;
}

function renderCatPath() {
  qs('cat-path').textContent = `Path: ${state.catStack.map((s) => s.title).join(' / ')}`;
  qs('cat-back').style.display = state.catStack.length > 1 ? 'inline-flex' : 'none';
}

function clearCatForm() {
  state.catEditingId = null;
  qs('cat-editing').textContent = '(new)';
  qs('cat-name').value = '';
  qs('cat-imageUrl').value = '';
  qs('cat-order').value = '0';
  qs('cat-active').value = 'true';
}

async function loadCategories() {
  qs('cat-error').style.display = 'none';

  const parentId = catCurrentParentId();
  const q = parentId ? `?parentId=${encodeURIComponent(parentId)}` : '';
  const items = await apiFetch(`/admin/categories${q}`);

  const tbody = qs('cat-tbody');
  tbody.innerHTML = '';

  items.forEach((c) => {
    const tr = document.createElement('tr');

    const tdName = document.createElement('td');
    const nameWrap = document.createElement('div');
    nameWrap.className = 'name-with-thumb';

    if (c.imageUrl) {
      const img = document.createElement('img');
      img.className = 'thumb';
      img.src = c.imageUrl;
      img.alt = c.name || 'Category';
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      img.onerror = () => {
        img.style.display = 'none';
      };
      nameWrap.appendChild(img);
    }

    const btnOpen = document.createElement('button');
    btnOpen.className = 'btn secondary small';
    btnOpen.textContent = c.name;
    btnOpen.title = 'Open subcategories';
    btnOpen.onclick = () => {
      state.catStack.push({ parentId: c.id, title: c.name });
      state.catEditingId = null;
      clearCatForm();
      showCategories();
    };
    nameWrap.appendChild(btnOpen);
    tdName.appendChild(nameWrap);

    const tdActive = document.createElement('td');
    tdActive.textContent = String(c.isActive);

    const tdOrder = document.createElement('td');
    tdOrder.textContent = String(c.order);

    const tdActions = document.createElement('td');
    tdActions.style.display = 'flex';
    tdActions.style.gap = '8px';

    const btnEdit = document.createElement('button');
    btnEdit.className = 'btn secondary small';
    btnEdit.textContent = 'Edit';
    btnEdit.onclick = () => {
      state.catEditingId = c.id;
      qs('cat-editing').textContent = c.id;
      qs('cat-name').value = c.name || '';
      qs('cat-imageUrl').value = c.imageUrl || '';
      qs('cat-order').value = String(c.order || 0);
      qs('cat-active').value = String(Boolean(c.isActive));
    };

    const btnDelete = document.createElement('button');
    btnDelete.className = 'btn danger small';
    btnDelete.textContent = 'Delete';
    btnDelete.onclick = async () => {
      if (!confirm('Delete category?')) return;
      try {
        await apiFetch(`/categories/${c.id}`, { method: 'DELETE' });
        showToast('success', 'Deleted');
        await loadCategories();
      } catch (e) {
        showToast('error', e.message);
      }
    };

    tdActions.appendChild(btnEdit);
    tdActions.appendChild(btnDelete);

    tr.appendChild(tdName);
    tr.appendChild(tdActive);
    tr.appendChild(tdOrder);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });
}

async function saveCategory() {
  const name = qs('cat-name').value.trim();
  const imageUrl = qs('cat-imageUrl').value.trim();
  const order = Number(qs('cat-order').value || 0);
  const isActive = qs('cat-active').value === 'true';

  if (!name) return showToast('error', 'Name is required');

  const body = { name, imageUrl: imageUrl ? imageUrl : null, order, isActive };

  try {
    if (state.catEditingId) {
      await apiFetch(`/categories/${state.catEditingId}`, { method: 'PUT', body: JSON.stringify(body) });
      showToast('success', 'Updated');
    } else {
      await apiFetch('/categories', {
        method: 'POST',
        body: JSON.stringify({ ...body, parentId: catCurrentParentId() }),
      });
      showToast('success', 'Created');
    }

    clearCatForm();
    await loadCategories();
  } catch (e) {
    showToast('error', e.message);
  }
}

async function showCategories() {
  showView('view-categories');
  renderCatPath();

  try {
    await loadCategories();
  } catch (e) {
    qs('cat-error').textContent = e.message;
    qs('cat-error').style.display = 'block';
  }
}
