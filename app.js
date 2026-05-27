/* ===================================================
   INVOICE PRO — app.js
   Full invoice logic: products, settings, calculations
=================================================== */

// ─── STATE ───────────────────────────────────────────
const STORAGE_KEY = 'invoicepro_data';

let state = {
  settings: {
    companyName:  'Your Company Name',
    tagline:      'Professional Services',
    address:      '123 Business Ave, City, Country',
    email:        'contact@company.com',
    phone:        '+1 234 567 8900',
    website:      '',
    taxNum:       '',
    currency:     'USD',
    dateFormat:   'MM/DD/YYYY',
    defaultTax:   0,
    terms:        'Net 30',
    accent:       '#1a1a2e',
    prefix:       'INV-',
    footer:       'Thank you for your business!',
    powered:      'Powered by InvoicePro',
    defaultNotes: '',
    logo:         ''
  },
  products: [
    { id: 1, name: 'Web Design',        type: 'Service',  desc: 'Custom website design & UI/UX', price: 500,  tax: 0,   unit: 'project', category: 'Design' },
    { id: 2, name: 'SEO Package',       type: 'Service',  desc: 'On-page & off-page SEO',        price: 299,  tax: 0,   unit: 'month',   category: 'Marketing' },
    { id: 3, name: 'Logo Design',       type: 'Service',  desc: 'Brand identity & logo',         price: 150,  tax: 0,   unit: 'project', category: 'Design' },
    { id: 4, name: 'Hosting (Annual)',  type: 'Product',  desc: 'Cloud hosting - 1 year',        price: 120,  tax: 5,   unit: 'year',    category: 'Hosting' },
    { id: 5, name: 'Consultation',     type: 'Service',  desc: '1-hr expert consultation',      price: 80,   tax: 0,   unit: 'hour',    category: 'Consulting' },
  ],
  items: [],
  nextProductId: 6,
  editingProductId: null
};

// Currency symbols map
const CURRENCIES = {
  USD: '$', EUR: '€', GBP: '£', PKR: '₨', INR: '₹',
  AED: 'د.إ', SAR: '﷼', CAD: 'CA$', AUD: 'A$', JPY: '¥',
  CNY: '¥', CHF: 'CHF', SGD: 'S$', MYR: 'RM', BDT: '৳',
  TRY: '₺', BRL: 'R$', ZAR: 'R', NGN: '₦', KWD: 'KD',
  QAR: 'QR', OMR: '﷼', BHD: 'BD'
};

function currSymbol() {
  return CURRENCIES[state.settings.currency] || '$';
}

function fmtMoney(val) {
  const num = parseFloat(val) || 0;
  return currSymbol() + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── PERSISTENCE ─────────────────────────────────────
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = Object.assign(state, parsed);
    }
  } catch(e) {}
}

// ─── INIT ─────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  loadState();
  setDefaultDates();
  applySettingsToUI();
  applyAccent(state.settings.accent);
  renderItems();
  renderProductGrid();
  populateSettingsForm();
  recalculate();
});

function setDefaultDates() {
  const today = new Date();
  const due   = new Date(); due.setDate(due.getDate() + 30);
  document.getElementById('inv-date').value = toInputDate(today);
  document.getElementById('inv-due').value  = toInputDate(due);
}
function toInputDate(d) {
  return d.toISOString().split('T')[0];
}

// ─── TAB SWITCHING ────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  document.querySelector(`[data-tab="${name}"]`).classList.add('active');
  if (name === 'products') renderProductGrid();
}

// ─── SETTINGS ─────────────────────────────────────────
function populateSettingsForm() {
  const s = state.settings;
  document.getElementById('s-company-name').value = s.companyName;
  document.getElementById('s-tagline').value       = s.tagline;
  document.getElementById('s-address').value       = s.address;
  document.getElementById('s-email').value         = s.email;
  document.getElementById('s-phone').value         = s.phone;
  document.getElementById('s-website').value       = s.website;
  document.getElementById('s-taxnum').value        = s.taxNum;
  document.getElementById('s-currency').value      = s.currency;
  document.getElementById('s-dateformat').value    = s.dateFormat;
  document.getElementById('s-defaulttax').value    = s.defaultTax;
  document.getElementById('s-terms').value         = s.terms;
  document.getElementById('s-accent').value        = s.accent;
  document.getElementById('s-prefix').value        = s.prefix;
  document.getElementById('s-footer').value        = s.footer;
  document.getElementById('s-powered').value       = s.powered;
  document.getElementById('s-notes').value         = s.defaultNotes;

  if (s.logo) {
    document.getElementById('logo-preview-settings').src     = s.logo;
    document.getElementById('logo-preview-settings').style.display = 'block';
  }
  updateCurrencyPreview();
}

function saveSettings() {
  const s = state.settings;
  s.companyName  = document.getElementById('s-company-name').value.trim() || 'Your Company';
  s.tagline      = document.getElementById('s-tagline').value.trim();
  s.address      = document.getElementById('s-address').value.trim();
  s.email        = document.getElementById('s-email').value.trim();
  s.phone        = document.getElementById('s-phone').value.trim();
  s.website      = document.getElementById('s-website').value.trim();
  s.taxNum       = document.getElementById('s-taxnum').value.trim();
  s.currency     = document.getElementById('s-currency').value;
  s.dateFormat   = document.getElementById('s-dateformat').value;
  s.defaultTax   = parseFloat(document.getElementById('s-defaulttax').value) || 0;
  s.terms        = document.getElementById('s-terms').value.trim();
  s.accent       = document.getElementById('s-accent').value;
  s.prefix       = document.getElementById('s-prefix').value.trim() || 'INV-';
  s.footer       = document.getElementById('s-footer').value.trim();
  s.powered      = document.getElementById('s-powered').value.trim();
  s.defaultNotes = document.getElementById('s-notes').value.trim();

  applySettingsToUI();
  applyAccent(s.accent);
  saveState();
  recalculate();
  showToast('Settings saved!', 'success');
}

function applySettingsToUI() {
  const s = state.settings;
  document.getElementById('inv-company-name').textContent    = s.companyName;
  document.getElementById('inv-company-tagline').textContent = s.tagline;
  document.getElementById('inv-company-address').textContent = s.address;
  document.getElementById('inv-company-email').textContent   = s.email;
  document.getElementById('inv-company-phone').textContent   = s.phone;
  document.getElementById('inv-footer-text').textContent     = s.footer;
  document.getElementById('inv-powered-text').textContent    = s.powered;
  document.getElementById('sidebar-powered').textContent     = s.powered;

  // Auto-generate invoice number from prefix
  const current = document.getElementById('inv-number').value;
  if (current.startsWith('INV-') || current === '') {
    const num = current.replace(/\D/g, '') || '0001';
    document.getElementById('inv-number').value = s.prefix + num.padStart(4, '0');
  }

  // Logo
  const logo    = s.logo;
  const preview = document.getElementById('company-logo-preview');
  const holder  = document.getElementById('logo-placeholder');
  if (logo) {
    preview.src            = logo;
    preview.style.display  = 'block';
    holder.style.display   = 'none';
  } else {
    preview.style.display  = 'none';
    holder.style.display   = 'flex';
  }

  // Default notes
  if (s.defaultNotes && !document.getElementById('inv-notes').value) {
    document.getElementById('inv-notes').value = s.defaultNotes;
  }
}

function applyAccent(color) {
  document.documentElement.style.setProperty('--accent', color);
  // Derive a darker shade for mid
  document.documentElement.style.setProperty('--accent-mid', color);
}

function updateCurrencyPreview() {
  const sel = document.getElementById('s-currency').value;
  const sym = CURRENCIES[sel] || '$';
  document.getElementById('currency-preview-val').textContent = sym + '1,234.56';
}

// ─── LOGO UPLOAD ──────────────────────────────────────
function handleLogoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    state.settings.logo = e.target.result;
    document.getElementById('logo-preview-settings').src          = e.target.result;
    document.getElementById('logo-preview-settings').style.display = 'block';
    applySettingsToUI();
    saveState();
  };
  reader.readAsDataURL(file);
}

function removeLogo() {
  state.settings.logo = '';
  document.getElementById('logo-preview-settings').style.display = 'none';
  document.getElementById('logo-upload').value = '';
  applySettingsToUI();
  saveState();
}

// ─── INVOICE ITEMS ────────────────────────────────────
function createItem(overrides = {}) {
  return Object.assign({
    id:    Date.now() + Math.random(),
    desc:  '',
    qty:   1,
    price: 0,
    disc:  0,
    tax:   state.settings.defaultTax,
    total: 0
  }, overrides);
}

function addBlankRow() {
  state.items.push(createItem());
  renderItems();
  recalculate();
  // Focus last desc
  setTimeout(() => {
    const rows = document.querySelectorAll('.item-desc');
    if (rows.length) rows[rows.length - 1].focus();
  }, 50);
}

function addItemFromProduct(product) {
  state.items.push(createItem({
    desc:  product.name + (product.desc ? ' — ' + product.desc : ''),
    price: product.price,
    tax:   product.tax,
    qty:   1,
    disc:  0
  }));
  renderItems();
  recalculate();
  closeCatalog();
  switchTab('invoice');
  showToast(`"${product.name}" added to invoice`, 'success');
}

function removeItem(id) {
  state.items = state.items.filter(i => i.id !== id);
  renderItems();
  recalculate();
}

function renderItems() {
  const tbody = document.getElementById('items-body');
  tbody.innerHTML = '';

  state.items.forEach((item) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input class="item-desc"  value="${esc(item.desc)}"  placeholder="Item description"
          oninput="updateItem(${item.id}, 'desc', this.value)" /></td>
      <td><input type="number" value="${item.qty}"   min="0" step="0.01"
          oninput="updateItem(${item.id}, 'qty', this.value)" /></td>
      <td><input type="number" value="${item.price}" min="0" step="0.01"
          oninput="updateItem(${item.id}, 'price', this.value)" /></td>
      <td><input type="number" value="${item.disc}"  min="0" max="100" step="0.01"
          placeholder="%" oninput="updateItem(${item.id}, 'disc', this.value)" /></td>
      <td><input type="number" value="${item.tax}"   min="0" max="100" step="0.01"
          placeholder="%" oninput="updateItem(${item.id}, 'tax', this.value)" /></td>
      <td class="col-total" id="row-total-${item.id}">${fmtMoney(item.total)}</td>
      <td><button class="del-btn" onclick="removeItem(${item.id})"><i class="fa-solid fa-trash"></i></button></td>
    `;
    tbody.appendChild(tr);
  });
}

function updateItem(id, field, value) {
  const item = state.items.find(i => i.id === id);
  if (!item) return;
  item[field] = (['qty','price','disc','tax'].includes(field)) ? parseFloat(value) || 0 : value;
  const lineSubtotal = item.qty * item.price;
  const discAmt      = lineSubtotal * (item.disc / 100);
  const afterDisc    = lineSubtotal - discAmt;
  const taxAmt       = afterDisc * (item.tax / 100);
  item.total         = afterDisc + taxAmt;

  const el = document.getElementById('row-total-' + id);
  if (el) el.textContent = fmtMoney(item.total);
  recalculate();
}

function recalculate() {
  let subtotal = 0, discTotal = 0, taxTotal = 0;

  state.items.forEach(item => {
    const lineSub  = (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0);
    const discAmt  = lineSub * ((parseFloat(item.disc) || 0) / 100);
    const afterD   = lineSub - discAmt;
    const taxAmt   = afterD * ((parseFloat(item.tax) || 0) / 100);
    item.total     = afterD + taxAmt;
    subtotal      += lineSub;
    discTotal     += discAmt;
    taxTotal      += taxAmt;
  });

  const shipping = parseFloat(document.getElementById('total-shipping')?.value) || 0;
  const grand    = subtotal - discTotal + taxTotal + shipping;

  document.getElementById('total-subtotal').textContent = fmtMoney(subtotal);
  document.getElementById('total-discount').textContent = fmtMoney(discTotal);
  document.getElementById('total-tax').textContent      = fmtMoney(taxTotal);
  document.getElementById('total-grand').textContent    = fmtMoney(grand);
  saveState();
}

function resetInvoice() {
  if (!confirm('Reset the invoice? All items and client info will be cleared.')) return;
  state.items = [];
  renderItems();
  document.getElementById('client-name').value    = '';
  document.getElementById('client-company').value = '';
  document.getElementById('client-address').value = '';
  document.getElementById('client-email').value   = '';
  document.getElementById('client-phone').value   = '';
  document.getElementById('pay-bank').value       = '';
  document.getElementById('pay-account').value    = '';
  document.getElementById('pay-routing').value    = '';
  document.getElementById('pay-method').value     = '';
  document.getElementById('inv-notes').value      = state.settings.defaultNotes;
  document.getElementById('total-shipping').value = 0;
  document.getElementById('inv-status').value     = 'Unpaid';
  setDefaultDates();
  recalculate();
  showToast('Invoice reset.', 'info');
}

// ─── PRODUCTS & SERVICES ──────────────────────────────
function renderProductGrid() {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = '';

  if (!state.products.length) {
    grid.innerHTML = '<p style="color:var(--muted);padding:20px;">No products yet. Click "Add New" to create one.</p>';
    return;
  }

  state.products.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <div class="badge">${esc(p.category || p.type)}</div>
      <div class="product-card-type">${esc(p.type)}</div>
      <div class="product-card-name">${esc(p.name)}</div>
      <div class="product-card-desc">${esc(p.desc || '—')}</div>
      <div class="product-card-price">${fmtMoney(p.price)} <span class="product-card-unit">/ ${esc(p.unit || 'unit')}</span></div>
      ${p.tax ? `<div class="product-card-unit" style="margin-top:4px;">Tax: ${p.tax}%</div>` : ''}
      <div class="product-card-actions">
        <button class="btn btn-ghost btn-sm" onclick="addItemFromProduct(${JSON.stringify(p).replace(/"/g,'&quot;')})">
          <i class="fa-solid fa-plus"></i> Add to Invoice
        </button>
        <button class="btn btn-outline btn-sm" onclick="openProductModal(${p.id})">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="btn btn-sm" style="background:#fef0f0;color:var(--danger);border:1px solid #fbd4d4;"
            onclick="deleteProduct(${p.id})">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function openProductModal(id) {
  state.editingProductId = id || null;
  const modal = document.getElementById('product-modal');
  document.getElementById('modal-title').textContent = id ? 'Edit Product / Service' : 'Add Product / Service';

  if (id) {
    const p = state.products.find(x => x.id === id);
    if (p) {
      document.getElementById('p-name').value     = p.name;
      document.getElementById('p-type').value     = p.type;
      document.getElementById('p-desc').value     = p.desc;
      document.getElementById('p-price').value    = p.price;
      document.getElementById('p-tax').value      = p.tax;
      document.getElementById('p-unit').value     = p.unit;
      document.getElementById('p-category').value = p.category;
    }
  } else {
    document.getElementById('p-name').value     = '';
    document.getElementById('p-type').value     = 'Service';
    document.getElementById('p-desc').value     = '';
    document.getElementById('p-price').value    = '';
    document.getElementById('p-tax').value      = state.settings.defaultTax;
    document.getElementById('p-unit').value     = '';
    document.getElementById('p-category').value = '';
  }

  modal.classList.add('open');
}

function closeProductModal() {
  document.getElementById('product-modal').classList.remove('open');
  state.editingProductId = null;
}

function saveProduct() {
  const name  = document.getElementById('p-name').value.trim();
  const price = parseFloat(document.getElementById('p-price').value);
  if (!name) { showToast('Product name is required.', 'error'); return; }
  if (isNaN(price)) { showToast('Valid price is required.', 'error'); return; }

  const productData = {
    name,
    type:     document.getElementById('p-type').value,
    desc:     document.getElementById('p-desc').value.trim(),
    price,
    tax:      parseFloat(document.getElementById('p-tax').value) || 0,
    unit:     document.getElementById('p-unit').value.trim() || 'unit',
    category: document.getElementById('p-category').value.trim()
  };

  if (state.editingProductId) {
    const idx = state.products.findIndex(p => p.id === state.editingProductId);
    if (idx > -1) state.products[idx] = { ...state.products[idx], ...productData };
    showToast('Product updated!', 'success');
  } else {
    productData.id = state.nextProductId++;
    state.products.push(productData);
    showToast('Product added!', 'success');
  }

  saveState();
  renderProductGrid();
  closeProductModal();
}

function deleteProduct(id) {
  if (!confirm('Delete this product/service?')) return;
  state.products = state.products.filter(p => p.id !== id);
  saveState();
  renderProductGrid();
  showToast('Deleted.', 'info');
}

// ─── CATALOG POPUP ────────────────────────────────────
function toggleCatalog() {
  const popup = document.getElementById('catalog-popup');
  popup.classList.toggle('open');
  if (popup.classList.contains('open')) {
    renderCatalogList();
    document.getElementById('catalog-search').focus();
  }
}

function closeCatalog() {
  document.getElementById('catalog-popup').classList.remove('open');
}

document.addEventListener('click', (e) => {
  const popup = document.getElementById('catalog-popup');
  if (popup && !popup.closest('.catalog-dropdown')?.contains(e.target)) {
    closeCatalog();
  }
});

function renderCatalogList() {
  const q    = (document.getElementById('catalog-search')?.value || '').toLowerCase();
  const list = document.getElementById('catalog-list');
  list.innerHTML = '';

  const filtered = state.products.filter(p =>
    p.name.toLowerCase().includes(q) ||
    (p.desc || '').toLowerCase().includes(q) ||
    (p.category || '').toLowerCase().includes(q)
  );

  if (!filtered.length) {
    list.innerHTML = '<div class="catalog-empty">No products found</div>';
    return;
  }

  filtered.forEach(p => {
    const item = document.createElement('div');
    item.className = 'catalog-item';
    item.innerHTML = `
      <div>
        <div class="catalog-item-name">${esc(p.name)}</div>
        <div class="catalog-item-type">${esc(p.type)} ${p.category ? '· ' + esc(p.category) : ''}</div>
      </div>
      <div class="catalog-item-price">${fmtMoney(p.price)}${p.unit ? ' / ' + esc(p.unit) : ''}</div>
    `;
    item.onclick = () => addItemFromProduct(p);
    list.appendChild(item);
  });
}

// ─── PRINT ────────────────────────────────────────────
function printInvoice() {
  window.print();
}

// ─── UTILS ────────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let toastTimeout;
function showToast(msg, type = 'info') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position:fixed; bottom:28px; right:28px; padding:12px 22px;
      background:var(--accent); color:#fff; border-radius:10px;
      font-family:'DM Sans',sans-serif; font-size:.88rem; font-weight:600;
      box-shadow:0 6px 24px rgba(0,0,0,.2); z-index:9999;
      transition:opacity .3s; opacity:0;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.background = type === 'success' ? '#3dba7e' : type === 'error' ? '#e05252' : 'var(--accent)';
  toast.style.opacity = '1';
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { toast.style.opacity = '0'; }, 2800);
}
