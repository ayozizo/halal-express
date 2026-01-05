function route() {
  const hash = location.hash || '#/dashboard';
  const path = hash.replace(/^#/, '');

  if (!state.me) {
    showView('view-login');
    return;
  }

  if (path.startsWith('/dashboard')) return showDashboard();
  if (path.startsWith('/categories')) return showCategories();
  if (path.startsWith('/products')) return showProducts();
  if (path.startsWith('/orders')) return showOrders();
  if (path.startsWith('/invoices')) return showInvoices();
  if (path.startsWith('/users')) return showUsers();

  return showDashboard();
}
