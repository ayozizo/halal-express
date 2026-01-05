async function loadUsers() {
  const tbody = qs('users-tbody');
  tbody.innerHTML = '';

  const users = await apiFetch('/admin/users');

  users.forEach((u) => {
    const tr = document.createElement('tr');

    const tdId = document.createElement('td');
    tdId.innerHTML = `<code>${u.id.slice(0, 8)}</code>`;

    const tdEmail = document.createElement('td');
    tdEmail.textContent = u.email;

    const tdName = document.createElement('td');
    tdName.textContent = u.name || '';

    const tdAdmin = document.createElement('td');
    tdAdmin.textContent = String(u.isAdmin);

    const tdCreated = document.createElement('td');
    tdCreated.textContent = u.createdAt ? new Date(u.createdAt).toLocaleString() : '';

    tr.appendChild(tdId);
    tr.appendChild(tdEmail);
    tr.appendChild(tdName);
    tr.appendChild(tdAdmin);
    tr.appendChild(tdCreated);

    tbody.appendChild(tr);
  });
}

async function showUsers() {
  showView('view-users');
  qs('users-error').style.display = 'none';
  try {
    await loadUsers();
  } catch (e) {
    qs('users-error').textContent = e.message;
    qs('users-error').style.display = 'block';
  }
}
