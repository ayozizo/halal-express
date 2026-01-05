async function loadInvoices() {
  const tbody = qs('inv-tbody');
  tbody.innerHTML = '';

  const invoices = await apiFetch('/admin/invoices');

  invoices.forEach((inv) => {
    const tr = document.createElement('tr');

    const tdNum = document.createElement('td');
    tdNum.innerHTML = `<code>${inv.number}</code>`;

    const tdOrder = document.createElement('td');
    tdOrder.innerHTML = `<code>${inv.order.id.slice(0, 8)}</code>`;

    const tdUser = document.createElement('td');
    tdUser.textContent = inv.order.user ? (inv.order.user.email || inv.order.userId) : inv.order.userId;

    const tdTotal = document.createElement('td');
    tdTotal.textContent = String(inv.order.total);

    const tdStatus = document.createElement('td');
    tdStatus.textContent = inv.order.status;

    const tdIssued = document.createElement('td');
    tdIssued.textContent = new Date(inv.issuedAt).toLocaleString();

    const tdPdf = document.createElement('td');
    const a = document.createElement('a');
    a.href = `/api/orders/${inv.order.id}/invoice.pdf`;
    a.target = '_blank';
    a.rel = 'noreferrer';
    a.textContent = 'PDF';
    tdPdf.appendChild(a);

    tr.appendChild(tdNum);
    tr.appendChild(tdOrder);
    tr.appendChild(tdUser);
    tr.appendChild(tdTotal);
    tr.appendChild(tdStatus);
    tr.appendChild(tdIssued);
    tr.appendChild(tdPdf);

    tbody.appendChild(tr);
  });
}

async function showInvoices() {
  showView('view-invoices');
  qs('inv-error').style.display = 'none';
  try {
    await loadInvoices();
  } catch (e) {
    qs('inv-error').textContent = e.message;
    qs('inv-error').style.display = 'block';
  }
}
