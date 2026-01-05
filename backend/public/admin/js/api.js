async function apiFetch(path, init) {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init && init.headers ? init.headers : {}),
    },
    credentials: 'include',
  });

  if (!res.ok) {
    let body = null;
    try {
      body = await res.json();
    } catch {
      // ignore
    }
    const msg = body && body.error ? body.error : `HTTP ${res.status}`;
    throw new Error(msg);
  }

  if (res.status === 204) return null;
  return res.json();
}

function qs(id) {
  return document.getElementById(id);
}

function showToast(type, msg) {
  const el = qs('toast');
  el.className = `toast ${type}`;
  el.textContent = msg;
  el.style.display = 'block';
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    el.style.display = 'none';
  }, 3500);
}
