function paymentStatusSelect(payment) {
  const statuses = ['unpaid', 'pending', 'paid', 'failed', 'refunded'];
  const sel = document.createElement('select');
  sel.className = 'input';
  sel.style.width = '160px';

  statuses.forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    sel.appendChild(opt);
  });

  sel.value = payment.status;

  sel.onchange = async () => {
    try {
      await apiFetch(`/payments/admin/${payment.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: sel.value }),
      });
      showToast('success', 'Payment status updated');
      await loadPayments();
    } catch (e) {
      showToast('error', e.message);
    }
  };

  return sel;
}

function refundButton(payment) {
  const wrap = document.createElement('div');
  wrap.style.display = 'flex';
  wrap.style.gap = '8px';

  const btn = document.createElement('button');
  btn.className = 'btn danger small';
  btn.textContent = 'Refund';

  const isStripe = payment.method === 'stripe';
  if (!isStripe) {
    btn.disabled = true;
    btn.title = 'Refunds supported for Stripe payments only';
  }

  btn.onclick = async () => {
    if (!isStripe) return;

    const txt = prompt('Refund amount (optional). Leave empty for full refund:');
    let amount = null;
    if (txt != null && String(txt).trim() !== '') {
      const parsed = Number(String(txt).trim());
      if (!Number.isFinite(parsed) || parsed <= 0) {
        showToast('error', 'Invalid amount');
        return;
      }
      amount = parsed;
    }

    if (!confirm('Confirm refund?')) return;

    try {
      await apiFetch(`/payments/admin/${payment.id}/refund`, {
        method: 'POST',
        body: JSON.stringify(amount != null ? { amount } : {}),
      });
      showToast('success', 'Refund created');
      await loadPayments();
    } catch (e) {
      showToast('error', e.message);
    }
  };

  wrap.appendChild(btn);
  return wrap;
}

async function loadPayments() {
  const tbody = qs('payments-tbody');
  tbody.innerHTML = '';

  const payments = await apiFetch('/payments/admin');

  payments.forEach((p) => {
    const tr = document.createElement('tr');

    const tdId = document.createElement('td');
    tdId.innerHTML = `<code>${p.id.slice(0, 8)}</code>`;

    const tdOrder = document.createElement('td');
    tdOrder.textContent = p.order ? p.order.id.slice(0, 8) : p.orderId;

    const tdUser = document.createElement('td');
    tdUser.textContent = p.order && p.order.user ? (p.order.user.email || p.order.userId) : '';

    const tdMethod = document.createElement('td');
    tdMethod.textContent = p.method;

    const tdAmount = document.createElement('td');
    tdAmount.textContent = `${p.amount} ${p.currency || 'SAR'}`;

    const tdStatus = document.createElement('td');
    tdStatus.appendChild(paymentStatusSelect(p));

    const tdActions = document.createElement('td');
    tdActions.appendChild(refundButton(p));

    const tdCreated = document.createElement('td');
    tdCreated.textContent = p.createdAt ? new Date(p.createdAt).toLocaleString() : '';

    tr.appendChild(tdId);
    tr.appendChild(tdOrder);
    tr.appendChild(tdUser);
    tr.appendChild(tdMethod);
    tr.appendChild(tdAmount);
    tr.appendChild(tdStatus);
    tr.appendChild(tdActions);
    tr.appendChild(tdCreated);

    tbody.appendChild(tr);
  });
}

async function showPayments() {
  showView('view-payments');
  qs('payments-error').style.display = 'none';
  try {
    await loadPayments();
  } catch (e) {
    qs('payments-error').textContent = e.message;
    qs('payments-error').style.display = 'block';
  }
}
