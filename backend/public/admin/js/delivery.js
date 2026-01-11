async function loadZones() {
  const tbody = qs('zones-tbody');
  tbody.innerHTML = '';

  const zones = await apiFetch('/delivery/zones/admin');

  zones.forEach((z) => {
    const tr = document.createElement('tr');

    const tdName = document.createElement('td');
    tdName.textContent = z.name;

    const tdPrefix = document.createElement('td');
    tdPrefix.textContent = z.postcodePrefix;

    const tdFee = document.createElement('td');
    tdFee.textContent = String(z.fee);

    const tdEta = document.createElement('td');
    tdEta.textContent = String(z.etaMinutes);

    const tdActive = document.createElement('td');
    tdActive.textContent = String(z.isActive);

    const tdActions = document.createElement('td');
    tdActions.style.display = 'flex';
    tdActions.style.gap = '8px';

    const btnEdit = document.createElement('button');
    btnEdit.className = 'btn secondary small';
    btnEdit.textContent = 'Edit';
    btnEdit.onclick = () => {
      state.zoneEditingId = z.id;
      qs('zone-editing').textContent = z.id;
      qs('zone-name').value = z.name || '';
      qs('zone-prefix').value = z.postcodePrefix || '';
      qs('zone-fee').value = String(z.fee || '0');
      qs('zone-eta').value = String(z.etaMinutes || 60);
      qs('zone-active').value = String(Boolean(z.isActive));
    };

    const btnDelete = document.createElement('button');
    btnDelete.className = 'btn danger small';
    btnDelete.textContent = 'Delete';
    btnDelete.onclick = async () => {
      if (!confirm('Delete delivery zone?')) return;
      try {
        await apiFetch(`/delivery/zones/${z.id}`, { method: 'DELETE' });
        showToast('success', 'Deleted');
        await loadZones();
      } catch (e) {
        showToast('error', e.message);
      }
    };

    tdActions.appendChild(btnEdit);
    tdActions.appendChild(btnDelete);

    tr.appendChild(tdName);
    tr.appendChild(tdPrefix);
    tr.appendChild(tdFee);
    tr.appendChild(tdEta);
    tr.appendChild(tdActive);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });
}

function clearZoneForm() {
  state.zoneEditingId = null;
  qs('zone-editing').textContent = '(new)';
  qs('zone-name').value = '';
  qs('zone-prefix').value = '';
  qs('zone-fee').value = '10';
  qs('zone-eta').value = '60';
  qs('zone-active').value = 'true';
}

async function saveZone() {
  const name = qs('zone-name').value.trim();
  const postcodePrefix = qs('zone-prefix').value.trim();
  const fee = Number(qs('zone-fee').value || 0);
  const etaMinutes = Number(qs('zone-eta').value || 60);
  const isActive = qs('zone-active').value === 'true';

  if (!name) return showToast('error', 'Name is required');
  if (!postcodePrefix) return showToast('error', 'Postcode prefix is required');

  const body = { name, postcodePrefix, fee, etaMinutes, isActive };

  try {
    if (state.zoneEditingId) {
      await apiFetch(`/delivery/zones/${state.zoneEditingId}`, { method: 'PUT', body: JSON.stringify(body) });
      showToast('success', 'Updated');
    } else {
      await apiFetch('/delivery/zones', { method: 'POST', body: JSON.stringify(body) });
      showToast('success', 'Created');
    }

    clearZoneForm();
    await loadZones();
  } catch (e) {
    showToast('error', e.message);
  }
}

async function loadCouriers() {
  const tbody = qs('couriers-tbody');
  tbody.innerHTML = '';

  const couriers = await apiFetch('/delivery/couriers');

  couriers.forEach((c) => {
    const tr = document.createElement('tr');

    const tdName = document.createElement('td');
    tdName.textContent = c.name;

    const tdPhone = document.createElement('td');
    tdPhone.textContent = c.phone || '';

    const tdActive = document.createElement('td');
    tdActive.textContent = String(c.isActive);

    const tdActions = document.createElement('td');
    tdActions.style.display = 'flex';
    tdActions.style.gap = '8px';

    const btnEdit = document.createElement('button');
    btnEdit.className = 'btn secondary small';
    btnEdit.textContent = 'Edit';
    btnEdit.onclick = () => {
      state.courierEditingId = c.id;
      qs('courier-editing').textContent = c.id;
      qs('courier-name').value = c.name || '';
      qs('courier-phone').value = c.phone || '';
      qs('courier-active').value = String(Boolean(c.isActive));
    };

    const btnDelete = document.createElement('button');
    btnDelete.className = 'btn danger small';
    btnDelete.textContent = 'Disable';
    btnDelete.onclick = async () => {
      try {
        await apiFetch(`/delivery/couriers/${c.id}`, { method: 'PUT', body: JSON.stringify({ isActive: false }) });
        showToast('success', 'Updated');
        await loadCouriers();
      } catch (e) {
        showToast('error', e.message);
      }
    };

    tdActions.appendChild(btnEdit);
    tdActions.appendChild(btnDelete);

    tr.appendChild(tdName);
    tr.appendChild(tdPhone);
    tr.appendChild(tdActive);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });
}

function clearCourierForm() {
  state.courierEditingId = null;
  qs('courier-editing').textContent = '(new)';
  qs('courier-name').value = '';
  qs('courier-phone').value = '';
  qs('courier-active').value = 'true';
}

async function saveCourier() {
  const name = qs('courier-name').value.trim();
  const phone = qs('courier-phone').value.trim();
  const isActive = qs('courier-active').value === 'true';

  if (!name) return showToast('error', 'Name is required');

  const body = { name, phone: phone ? phone : null, isActive };

  try {
    if (state.courierEditingId) {
      await apiFetch(`/delivery/couriers/${state.courierEditingId}`, { method: 'PUT', body: JSON.stringify(body) });
      showToast('success', 'Updated');
    } else {
      await apiFetch('/delivery/couriers', { method: 'POST', body: JSON.stringify(body) });
      showToast('success', 'Created');
    }

    clearCourierForm();
    await loadCouriers();
  } catch (e) {
    showToast('error', e.message);
  }
}

async function showDelivery() {
  showView('view-delivery');
  qs('delivery-error').style.display = 'none';
  try {
    await loadZones();
    await loadCouriers();
  } catch (e) {
    qs('delivery-error').textContent = e.message;
    qs('delivery-error').style.display = 'block';
  }
}
