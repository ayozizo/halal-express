function fillMeCard() {
  qs('me-id').textContent = state.me.id;
  qs('me-email').textContent = state.me.email;
  qs('me-admin').textContent = String(state.me.isAdmin);
}

async function showDashboard() {
  showView('view-dashboard');
  fillMeCard();
}
