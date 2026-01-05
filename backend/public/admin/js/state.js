const state = {
  me: null,
  catStack: [{ parentId: null, title: 'Top level' }],
  catEditingId: null,
  prodEditingId: null,
  prodTopCats: [],
  prodSubCats: [],
  prodCategoryId: '',
  prodSubCategoryId: '',
};

function hideAllViews() {
  document.querySelectorAll('.view').forEach((v) => (v.style.display = 'none'));
}

function showView(id) {
  hideAllViews();
  qs(id).style.display = 'block';
}
