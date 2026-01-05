function statusSelect(order) {
  const statuses = ['pending', 'inProgress', 'delivered', 'cancelled'];
  const sel = document.createElement('select');
  sel.className = 'input';
  sel.style.width = '160px';
  statuses.forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    sel.appendChild(opt);
  });
  sel.value = order.status;
  sel.onchange = async () => {
    try {
      await apiFetch(`/admin/orders/${order.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: sel.value }),
      });
      showToast('success', 'Status updated');
    } catch (e) {
      showToast('error', e.message);
    }
  };
  return sel;
}

async function loadOrders() {
  const tbody = qs('orders-tbody');
  tbody.innerHTML = '';

  const orders = await apiFetch('/admin/orders');

  orders.forEach((o) => {
    const tr = document.createElement('tr');

    const tdId = document.createElement('td');
    tdId.innerHTML = `<code>${o.id.slice(0, 8)}</code>`;

    const tdUser = document.createElement('td');
    tdUser.textContent = o.user && o.user.email ? o.user.email : o.userId;

    const tdStatus = document.createElement('td');
    tdStatus.appendChild(statusSelect(o));

    const tdTotal = document.createElement('td');
    tdTotal.textContent = String(o.total);

    const tdItems = document.createElement('td');
    tdItems.textContent = String((o.items || []).length);

    const tdInv = document.createElement('td');
    if (o.invoice) {
      const a = document.createElement('a');
      a.href = `/api/orders/${o.id}/invoice.pdf`;
      a.target = '_blank';
      a.rel = 'noreferrer';
      a.textContent = 'PDF';
      tdInv.appendChild(a);
    } else {
      tdInv.textContent = '-';
    }

    const tdCreated = document.createElement('td');
    tdCreated.textContent = new Date(o.createdAt).toLocaleString();

    tr.appendChild(tdId);
    tr.appendChild(tdUser);
    tr.appendChild(tdStatus);
    tr.appendChild(tdTotal);
    tr.appendChild(tdItems);
    tr.appendChild(tdInv);
    tr.appendChild(tdCreated);

    tbody.appendChild(tr);
  });
}

async function showOrders() {
  showView('view-orders');
  qs('orders-error').style.display = 'none';
  try {
    await loadOrders();
  } catch (e) {
    qs('orders-error').textContent = e.message;
    qs('orders-error').style.display = 'block';
  }
}
