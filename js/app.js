/* SHAHI — Main Application Controller */

// ============================================
// GLOBAL STATE
// ============================================
const state = {
  user: null,
  profile: null,
  role: 'staff',
  permissions: {},
  settings: {},
  customers: [],
  products: [],
  currentOrder: { customer: null, items: [] },
  currentProductId: null,
  currentCustomerId: null
};

// ============================================
// APP NAMESPACE (for inline HTML handlers)
// ============================================
window.app = {};

// ============================================
// UI MANAGERS
// ============================================
const toast = new SHAHI.ToastManager($('#toast-container'));
const loading = new SHAHI.LoadingManager($('#loading-overlay'));
const sheet = new SHAHI.SheetManager();

// ============================================
// NAVIGATION
// ============================================
const VIEW_MAP = {
  '': 'home',
  '/': 'home',
  '/home': 'home',
  '/orders': 'orders',
  '/orders/new': 'orders-new',
  '/orders/detail/:id': 'order-detail',
  '/customers': 'customers',
  '/customers/new': 'customers-form',
  '/customers/detail/:id': 'customers-form',
  '/products': 'products',
  '/products/new': 'products-form',
  '/products/detail/:id': 'product-detail',
  '/products/form/:id': 'products-form',
  '/admin': 'admin',
  '/admin/settings': 'admin',
  '/admin/users': 'admin',
  '/admin/business': 'admin'
};

function getViewFromHash(hash) {
  let path = hash.replace(/^#/, '').replace(/\/$/, '') || '/';
  // Handle detail routes
  if (path.startsWith('/orders/') && path !== '/orders/new') {
    return { view: 'order-detail', id: path.split('/')[2] };
  }
  if (path.startsWith('/customers/') && path !== '/customers/new') {
    return { view: 'customers-form', id: path.split('/')[2] };
  }
  if (path.startsWith('/products/') && path !== '/products/new') {
    return { view: 'product-detail', id: path.split('/')[2] };
  }
  return { view: VIEW_MAP[path] || 'home', id: null };
}

function navigateTo(pathOrView, id = null) {
  let hash = '';
  if (pathOrView.includes('/')) {
    hash = '#' + pathOrView;
  } else {
    // It's a view name
    const viewMap = {
      'home': '#/',
      'orders': '#/orders',
      'orders-new': '#/orders/new',
      'order-detail': id ? `#/orders/${id}` : '#/orders',
      'customers': '#/customers',
      'customers-form': id ? `#/customers/${id}` : '#/customers/new',
      'products': '#/products',
      'products-form': id ? `#/products/${id}` : '#/products/new',
      'product-detail': id ? `#/products/${id}` : '#/products',
      'admin': '#/admin'
    };
    hash = viewMap[pathOrView] || '#/';
  }
  window.location.hash = hash;
}

function showView(viewName, id = null) {
  // Hide all views
  $$('.view').forEach(v => v.classList.remove('active'));

  // Show target
  const targetId = {
    'home': 'view-home',
    'orders': 'view-orders',
    'orders-new': 'view-orders-new',
    'order-detail': 'view-order-detail',
    'customers': 'view-customers',
    'customers-form': 'view-customers-form',
    'products': 'view-products',
    'products-form': 'view-products-form',
    'product-detail': 'view-product-detail',
    'admin': 'view-admin'
  }[viewName];

  const el = $(`#${targetId}`);
  if (!el) {
    console.error('View not found:', targetId);
    navigateTo('home');
    return;
  }
  el.classList.add('active');

  // Update bottom nav
  $$('.nav-item').forEach(btn => {
    const active = btn.dataset.nav === viewName;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-current', active ? 'page' : null);
  });

  // FAB visibility
  const fab = $('#fab-primary');
  const newOrderBtn = $('#btn-new-order');
  if (fab) fab.style.display = (viewName === 'admin' || viewName === 'order-detail' || viewName === 'product-detail') ? 'none' : 'flex';
  if (newOrderBtn) newOrderBtn.style.display = (viewName === 'home') ? 'flex' : 'none';

  // Update header title
  const title = $('.app-title');
  const titles = {
    'home': 'SHAHI',
    'orders': 'Orders',
    'orders-new': 'New Order',
    'order-detail': 'Bill Details',
    'customers': 'Customers',
    'customers-form': id ? 'Edit Customer' : 'New Customer',
    'products': 'Products',
    'products-form': id ? 'Edit Product' : 'New Product',
    'product-detail': 'Product Details',
    'admin': 'Settings'
  };
  if (title) title.textContent = titles[viewName] || 'SHAHI';

  // Initialize view
  setTimeout(() => {
    const initFn = window[`initView${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`];
    if (initFn) initFn(id);
  }, 50);
}

function handleHashChange() {
  const { view, id } = getViewFromHash(window.location.hash);
  showView(view, id);
}

// ============================================
// AUTH & SETTINGS
// ============================================
async function initAuth() {
  window.supabase = new SHAHI.SupabaseClient(
    window.SHAHI_CONFIG.supabaseUrl,
    window.SHAHI_CONFIG.supabaseAnonKey
  );

  const session = await window.supabase.getSession();
  if (session) {
    const { data: { user } } = await window.supabase.getUser();
    if (user) await loadProfile(user.id);
  }
}

async function loadProfile(userId) {
  try {
    const { data: profile } = await window.supabase.select('users', { id: `eq.${userId}`, single: true });
    if (profile) {
      state.user = { id: userId, email: profile.email };
      state.profile = profile;
      state.role = profile.role || 'staff';
      state.permissions = profile.permissions || {};
      updateUIForRole();
    }
  } catch (e) {
    console.error('Profile load failed:', e);
  }
}

function updateUIForRole() {
  const isOwner = state.role === 'owner';
  const isMgr = state.role === 'owner' || state.role === 'manager';
  $$('[data-role-owner]').forEach(el => el.style.display = isOwner ? '' : 'none');
  $$('[data-role-manager]').forEach(el => el.style.display = isMgr ? '' : 'none');
}

function can(action) {
  if (state.role === 'owner') return true;
  return state.permissions[action] === true;
}

async function signOut() {
  await window.supabase.signOut();
  state.user = null; state.profile = null; state.role = 'staff'; state.permissions = {};
  navigateTo('home');
  location.reload();
}

// ============================================
// SETTINGS
// ============================================
async function loadSettings() {
  try {
    const { data } = await window.supabase.select('settings');
    if (data) {
      const s = {};
      data.forEach(item => { s[item.key] = item.value; });
      state.settings = s;
    }
  } catch (e) { console.warn('Settings load failed:', e); }
}

async function saveSetting(key, value) {
  try {
    await window.supabase.upsert('settings', { key, value });
    state.settings[key] = value;
    return true;
  } catch (e) { return false; }
}

// ============================================
// API HELPERS
// ============================================
async function apiGet(table, q = {}) { return window.supabase.select(table, q); }
async function apiPost(table, d) { return window.supabase.insert(table, d); }
async function apiPatch(table, id, d) { return window.supabase.update(table, id, d); }
async function apiDelete(table, id) { return window.supabase.delete(table, id); }
async function apiRpc(fn, p) { return window.supabase.rpc(fn, p); }

// ============================================
// VIEW: HOME
// ============================================
async function initViewHome() {
  await loadDashboard();
}

async function loadDashboard() {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const [{ data: orders }] = await Promise.all([
      apiGet('orders', {
        created_at: `gte.${today.toISOString()}`,
        created_at2: `lt.${tomorrow.toISOString()}`,
        select: 'id,total',
        order: 'created_at.desc'
      })
    ]);

    // Supabase doesn't support created_at2, filter manually
    const list = (orders || []).filter(o => {
      const d = new Date(o.created_at);
      return d >= today && d < tomorrow;
    });

    const sales = list.reduce((sum, o) => sum + parseNumber(o.total), 0);

    $('#stat-orders').textContent = list.length;
    $('#stat-sales').textContent = formatCurrency(sales);
  } catch (e) {
    $('#stat-orders').textContent = '—';
    $('#stat-sales').textContent = '—';
  }

  // Recent orders
  try {
    const { data, error } = await apiGet('orders', {
      select: 'id,bill_number,customer_name_snapshot,total,created_at',
      order: 'created_at.desc',
      limit: 5
    });
    if (error) throw error;
    renderRecentOrders(data || []);
  } catch (e) {
    console.error(e);
  }
}

function renderRecentOrders(orders) {
  const container = $('#recent-orders-list');
  if (!container) return;
  if (!orders.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 32px 16px;">
        <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <div class="empty-state__title">No orders yet</div>
        <p class="empty-state__text">Create your first order</p>
        <button class="btn btn--primary" onclick="navigateTo('orders-new')">Create Order</button>
      </div>`;
    return;
  }
  container.innerHTML = orders.map(o => `
    <a href="#orders/${o.id}" class="list-item" style="text-decoration: none; color: inherit;">
      <div style="width: 40px; height: 40px; border-radius: 8px; background: #fef2f2; display: flex; align-items: center; justify-content: center; color: #b91c1c; font-weight: 700; font-size: 14px; flex-shrink: 0;">
        ${o.bill_number?.split('-').pop() || '#'}
      </div>
      <div class="list-item__content">
        <div class="list-item__title">${o.bill_number}</div>
        <div class="list-item__subtitle">${o.customer_name_snapshot} • ${formatDateTime(o.created_at)}</div>
      </div>
      <div class="list-item__meta">${formatCurrency(o.total)}</div>
    </a>
  `).join('');
}

// ============================================
// VIEW: ORDERS LIST
// ============================================
async function initViewOrders() {
  await loadCustomersCache();
  await loadProductsCache();
  renderOrdersList();
}

async function renderOrdersList() {
  try {
    const { data, error } = await apiGet('orders', {
      select: 'id,bill_number,customer_name_snapshot,total,created_at',
      order: 'created_at.desc',
      limit: 50
    });
    if (error) throw error;
    const container = $('#orders-list');
    if (!container) return;

    if (!data || !data.length) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 48px 16px;">
          <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <div class="empty-state__title">No orders yet</div>
          <p class="empty-state__text">Create your first order</p>
          <button class="btn btn--primary" onclick="navigateTo('orders-new')">Create Order</button>
        </div>`;
      return;
    }

    container.innerHTML = data.map(o => `
      <a href="#orders/${o.id}" class="list-item" style="text-decoration: none; color: inherit;">
        <div style="width: 40px; height: 40px; border-radius: 8px; background: #fef2f2; display: flex; align-items: center; justify-content: center; color: #b91c1c; font-weight: 700; font-size: 14px; flex-shrink: 0;">
          ${o.bill_number?.split('-').pop() || '#'}
        </div>
        <div class="list-item__content">
          <div class="list-item__title">${o.bill_number}</div>
          <div class="list-item__subtitle">${o.customer_name_snapshot} • ${formatDateTime(o.created_at)}</div>
        </div>
        <div class="list-item__meta">${formatCurrency(o.total)}</div>
      </a>
    `).join('');

    $('#orders-search')?.addEventListener('input', SHAHI.debounce(() => {
      const term = $('#orders-search').value.toLowerCase();
      $$('#orders-list .list-item').forEach(item => {
        const t = item.textContent.toLowerCase();
        item.style.display = t.includes(term) ? 'flex' : 'none';
      });
    }, 200));
  } catch (e) {
    toast.error('Failed to load orders');
  }
}

// ============================================
// VIEW: NEW ORDER
// ============================================
async function initViewOrdersNew() {
  state.currentOrder = { customer: null, items: [] };
  await loadCustomersCache();
  await loadProductsCache();
  setupOrderForm();
  renderOrderItems();
}

function setupOrderForm() {
  const form = $('#order-form');
  if (!form) return;

  const customerInput = $('#order-customer');
  const clearBtn = $('#btn-clear-customer');

  customerInput?.addEventListener('focus', showCustomerPicker);
  customerInput?.addEventListener('input', SHAHI.debounce(() => filterCustomerPicker(customerInput.value), 150));
  clearBtn?.addEventListener('click', () => {
    customerInput.value = '';
    clearBtn.style.display = 'none';
    state.currentOrder.customer = null;
    renderOrderItems();
    updateOrderTotal();
  });

  $('#btn-add-item')?.addEventListener('click', openProductPicker);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitOrder();
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.customer-picker') && !e.target.closest('#order-customer')) {
      hideCustomerPicker();
    }
  });
}

function showCustomerPicker() {
  hideCustomerPicker();
  const picker = document.createElement('div');
  picker.className = 'customer-picker sheet';
  picker.style.cssText = 'position:fixed;bottom:0;left:0;right:0;max-width:500px;margin:0 auto;border-radius:16px 16px 0 0;transform:translateY(0);max-height:60vh;display:flex;flex-direction:column;z-index:300;';
  picker.innerHTML = `
    <div class="sheet__handle"></div>
    <header class="sheet__header">
      <h2 class="sheet__title">Select Customer</h2>
      <button class="sheet__close"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </header>
    <div class="sheet__content" style="padding:16px;">
      <div class="search-box" style="margin-bottom:16px;">
        <input type="search" id="picker-customer-search" class="form-input" placeholder="Search customers...">
      </div>
      <div id="picker-customer-list" style="max-height:40vh;overflow-y:auto;">
        ${state.customers.filter(c => c.active).map(c => `
          <button type="button" class="list-item" data-cid="${c.id}" style="border:none;background:none;padding:16px;border-bottom:1px solid #c7c7cc;">
            <div class="list-item__content">
              <div class="list-item__title">${c.name}</div>
              <div class="list-item__subtitle">${c.mobile}${c.address ? ' • ' + c.address : ''}</div>
            </div>
          </button>
        `).join('')}
        <button type="button" class="list-item" id="btn-quick-create-customer" style="border:none;background:#fef2f2;color:#b91c1c;border-radius:12px;margin-top:12px;">
          <svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span style="margin-left:12px;font-weight:600;">Create New Customer</span>
        </button>
      </div>
    </header>`;
  // Note: header tag above is wrong, should be div. Fix below.
  picker.innerHTML = picker.innerHTML.replace('<header class="sheet__header">', '<div class="sheet__header">').replace('</header>', '</div>');

  customerInput.parentElement.style.position = 'relative';
  customerInput.parentElement.appendChild(picker);

  picker.querySelector('.sheet__close')?.onclick = hideCustomerPicker;
  $$('[data-cid]', picker).forEach(btn => btn.onclick = () => selectOrderCustomer(btn.dataset.cid));
  $('#btn-quick-create-customer', picker)?.onclick = () => { hideCustomerPicker(); app.openQuickCustomer(); };

  $('#picker-customer-search')?.addEventListener('input', SHAHI.debounce(() => {
    const term = $('#picker-customer-search').value.toLowerCase();
    $$('[data-cid]', picker).forEach(b => {
      const t = b.textContent.toLowerCase();
      b.style.display = t.includes(term) ? 'flex' : 'none';
    });
  }, 150));
}

function filterCustomerPicker(term) {
  const picker = $('.customer-picker');
  if (!picker) return;
  $$('[data-cid]', picker).forEach(b => {
    const t = b.textContent.toLowerCase();
    b.style.display = t.includes(term) ? 'flex' : 'none';
  });
}

function hideCustomerPicker() {
  const p = $('.customer-picker');
  if (p) p.remove();
}

function selectOrderCustomer(cid) {
  const c = state.customers.find(x => x.id === cid);
  if (!c) return;
  state.currentOrder.customer = c;
  const input = $('#order-customer');
  if (input) {
    input.value = c.name;
    input.nextElementSibling.style.display = 'block';
  }
  hideCustomerPicker();
  renderOrderItems();
  updateOrderTotal();
}

function openProductPicker() {
  const variants = state.products
    .filter(p => p.active)
    .flatMap(p => (p.variants || []).filter(v => v.active).map(v => ({ ...v, productName: p.name, productId: p.id, mainImage: p.mainImage })));

  const s = sheet.createSheet(`
    <div style="margin-bottom:16px;">
      <div class="search-box">
        <input type="search" id="product-picker-search" class="form-input" placeholder="Search products...">
      </div>
    </div>
    <div id="product-picker-list" style="max-height:50vh;overflow-y:auto;">
      ${variants.map(v => `
        <div class="card" style="margin-bottom:12px;border:none;background:#e5e5ea;" data-pid="${v.productId}">
          <div class="card__body" style="padding:12px;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
              <div style="width:44px;height:44px;border-radius:8px;background:#e5e5ea;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;">
                ${v.mainImage ? `<img src="${v.mainImage}" style="width:100%;height:100%;object-fit:cover">` : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>'}
              </div>
              <div style="flex:1;min-width:0;">
                <div style="font-weight:600;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${v.productName}</div>
                <div style="font-size:13px;color:#8e8e93;">${v.pack_name}</div>
              </div>
            </div>
            <button type="button" class="btn btn--primary btn--sm variant-select-btn" data-vid="${v.id}" data-pid="${v.productId}" data-pname="${v.pack_name}" data-rate="${v.default_rate}" style="width:100%;">
              Add ${v.pack_name} • ${formatCurrency(v.default_rate)}
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `, { title: 'Select Product', footer: '<button class="btn btn--outline btn--full" onclick="sheet.close()">Cancel</button>' });

  $('#product-picker-search')?.addEventListener('input', SHAHI.debounce(() => {
    const term = $('#product-picker-search').value.toLowerCase();
    $$('[data-pid]', s.sheet).forEach(c => {
      const t = c.textContent.toLowerCase();
      c.style.display = t.includes(term) ? 'block' : 'none';
    });
  }, 150));

  $$('.variant-select-btn', s.sheet).forEach(btn => {
    btn.onclick = () => {
      addOrderItem({
        productId: btn.dataset.pid,
        productVariantId: btn.dataset.vid,
        packName: btn.dataset.pname,
        defaultRate: parseNumber(btn.dataset.rate),
        quantity: 1
      });
      sheet.close();
    };
  });
}

function addOrderItem(item) {
  const existing = state.currentOrder.items.find(i => i.productVariantId === item.productVariantId);
  if (existing) {
    existing.quantity += 1;
  } else {
    const rate = state.currentOrder.customer ? getApplicableRate(item.productVariantId) : item.defaultRate;
    state.currentOrder.items.push({ ...item, appliedRate: rate, tempId: generateId() });
  }
  renderOrderItems();
  updateOrderTotal();
  $('#order-empty-state').style.display = 'none';
}

function getApplicableRate(variantId) {
  const v = state.products.flatMap(p => (p.variants || [])).find(v => v.id === variantId);
  return v?.default_rate || 0;
}

function renderOrderItems() {
  const container = $('#order-items-container');
  if (!container) return;
  if (state.currentOrder.items.length === 0) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = state.currentOrder.items.map((item, i) => `
    <div class="card" style="margin-bottom:12px;border:none;background:#e5e5ea;" data-tid="${item.tempId}">
      <div class="card__body" style="padding:12px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <div style="width:44px;height:44px;border-radius:8px;background:#e5e5ea;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;">
            ${item.productImage ? `<img src="${item.productImage}" style="width:100%;height:100%;object-fit:cover">` : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>'}
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:15px;">${item.productName || 'Product'}</div>
            <div style="font-size:13px;color:#8e8e93;">${item.packName}</div>
          </div>
          <button type="button" class="btn btn--ghost btn--sm" onclick="app.removeOrderItem('${item.tempId}')" aria-label="Remove">
            <svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:8px;">
            <label class="form-label" style="margin:0;font-size:12px;color:#8e8e93;">Qty</label>
            <div class="qty-control">
              <button type="button" class="qty-btn" onclick="app.changeQty('${item.tempId}', -1)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
              <input type="number" class="qty-input" id="item-qty-${i}" value="${item.quantity}" min="1" max="999" onchange="app.changeQtyDirect('${item.tempId}', this.value)">
              <button type="button" class="qty-btn" onclick="app.changeQty('${item.tempId}', 1)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <label class="form-label" style="margin:0;font-size:12px;color:#8e8e93;">Rate</label>
            <span id="item-rate-${i}" style="font-weight:600;font-family:monospace;">${formatCurrency(item.appliedRate)}</span>
          </div>
          <div style="margin-left:auto;display:flex;align-items:center;gap:8px;">
            <span style="font-size:13px;color:#8e8e93;">Amount</span>
            <span id="item-total-${i}" style="font-weight:600;font-family:monospace;">${formatCurrency(round2(item.appliedRate * item.quantity))}</span>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

app.changeQty = function(tempId, delta) {
  const item = state.currentOrder.items.find(i => i.tempId === tempId);
  if (!item) return;
  item.quantity = clamp(item.quantity + delta, 1, 999);
  renderOrderItems();
  updateOrderTotal();
};

app.changeQtyDirect = function(tempId, val) {
  const item = state.currentOrder.items.find(i => i.tempId === tempId);
  if (!item) return;
  item.quantity = clamp(parseNumber(val), 1, 999);
  renderOrderItems();
  updateOrderTotal();
};

app.removeOrderItem = function(tempId) {
  state.currentOrder.items = state.currentOrder.items.filter(i => i.tempId !== tempId);
  renderOrderItems();
  updateOrderTotal();
  if (state.currentOrder.items.length === 0) $('#order-empty-state').style.display = 'block';
};

function updateOrderTotal() {
  const total = state.currentOrder.items.reduce((s, i) => s + round2(i.appliedRate * i.quantity), 0);
  $('#order-total').textContent = formatCurrency(total);
}

async function submitOrder() {
  if (!state.currentOrder.customer) { toast.error('Select a customer'); return; }
  if (state.currentOrder.items.length === 0) { toast.error('Add at least one product'); return; }

  loading.show();
  try {
    const subtotal = state.currentOrder.items.reduce((s, i) => s + round2(i.appliedRate * i.quantity), 0);
    const billNumber = await apiRpc('generate_bill_number');

    const orderData = {
      bill_number: billNumber,
      customer_id: state.currentOrder.customer.id,
      customer_name_snapshot: state.currentOrder.customer.name,
      customer_mobile_snapshot: state.currentOrder.customer.mobile,
      customer_address_snapshot: state.currentOrder.customer.address || null,
      subtotal,
      total: subtotal,
      note: $('#order-note')?.value || '',
      created_by: state.user?.id
    };

    const [order] = await apiPost('orders', orderData);
    if (!order) throw new Error('Failed to create order');

    const items = state.currentOrder.items.map(item => {
      const v = state.products.flatMap(p => (p.variants || [])).find(v => v.id === item.productVariantId);
      return {
        order_id: order.id,
        product_id: item.productId,
        product_name_snapshot: item.productName || 'Product',
        product_variant_id: item.productVariantId,
        pack_name_snapshot: item.packName,
        quantity: item.quantity,
        unit_rate_snapshot: item.appliedRate,
        line_total: round2(item.appliedRate * item.quantity)
      };
    });
    await apiPost('order_items', items);

    loading.hide();
    toast.success('Bill created');
    navigateTo('order-detail', order.id);
  } catch (e) {
    loading.hide();
    console.error(e);
    toast.error(e.message || 'Failed to create bill');
  }
}

// ============================================
// VIEW: ORDER DETAIL
// ============================================
async function initViewOrderDetail(id) {
  try {
    loading.show();
    const [{ data: order }, { data: items }] = await Promise.all([
      apiGet('orders', { id: `eq.${id}`, single: true }),
      apiGet('order_items', { order_id: `eq.${id}`, order: 'created_at.asc' })
    ]);
    if (!order) throw new Error('Order not found');

    $('#order-detail-title').textContent = `Bill ${order.bill_number}`;
    renderOrderDetail(order, items || []);

    $('#btn-print-bill')?.onclick = () => printBill(order, items);
    $('#btn-share-bill')?.onclick = () => shareBill({ ...order, items });
    $('#btn-whatsapp-bill')?.onclick = () => openWhatsApp({ ...order, items });
  } catch (e) {
    console.error(e);
    toast.error('Failed to load order');
  } finally {
    loading.hide();
  }
}

function renderOrderDetail(order, items) {
  const container = $('#order-detail-content');
  const s = state.settings || {};
  container.innerHTML = `
    <div class="bill-print" style="padding:20px;">
      <div class="bill-print__header" style="text-align:center;margin-bottom:20px;">
        <img src="${window.SHAHI_CONFIG.logoUrl}" alt="Logo" class="bill-print__logo" style="height:70px;margin-bottom:10px;">
        <h2 class="bill-print__title" style="font-size:22px;font-weight:700;color:#b91c1c;margin:0 0 5px;">${s.business_name || 'SHAHI'}</h2>
        ${s.business_address ? `<p class="bill-print__info">${s.business_address}</p>` : ''}
        ${s.business_phone ? `<p class="bill-print__info">${s.business_phone}</p>` : ''}
        ${s.business_gstin ? `<p class="bill-print__info">GSTIN: ${s.business_gstin}</p>` : ''}
      </div>
      <div class="bill-print__divider" style="border-top:1px dashed #999;margin:12px 0;"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;font-size:13px;">
        <div><strong>Bill No:</strong> ${order.bill_number}</div>
        <div style="text-align:right;"><strong>Date:</strong> ${formatDateTime(order.created_at)}</div>
        <div><strong>Customer:</strong> ${order.customer_name_snapshot}</div>
        <div style="text-align:right;">${order.customer_mobile_snapshot || ''}</div>
      </div>
      <div class="bill-print__divider"></div>
      <table class="table" style="font-size:13px;">
        <thead>
          <tr>
            <th style="width:40%;">Product</th>
            <th style="width:15%;text-align:center;">Qty</th>
            <th style="width:20%;text-align:right;">Rate</th>
            <th style="width:25%;text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(i => `
            <tr>
              <td><div style="font-weight:600;">${i.product_name_snapshot}</div><div style="font-size:11px;color:#8e8e93;">${i.pack_name_snapshot}</div></td>
              <td style="text-align:center;">${i.quantity}</td>
              <td style="text-align:right;font-family:monospace;">${formatCurrency(i.unit_rate_snapshot)}</td>
              <td style="text-align:right;font-family:monospace;font-weight:600;">${formatCurrency(i.line_total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="bill-print__divider"></div>
      <div class="bill-print__total" style="font-size:18px;font-weight:700;text-align:right;margin-top:12px;padding-top:12px;border-top:2px solid #333;color:#b91c1c;">TOTAL: ${formatCurrency(order.total)}</div>
      ${order.note ? `<div class="bill-print__note" style="margin-top:20px;font-size:12px;color:#8e8e93;text-align:center;">Note: ${order.note}</div>` : ''}
      <div class="bill-print__footer" style="margin-top:20px;font-size:11px;color:#999;text-align:center;">${s.bill_footer || 'Thank you for your business!'}</div>
    </div>`;
}

function printBill(order, items) {
  const el = $('#order-detail-content');
  if (el) {
    const pw = window.open('', '_blank');
    pw.document.write(`<html><head><link rel="stylesheet" href="css/app.css"><style>@media print{@page{margin:0}body{padding:20mm}}</style></head><body>${el.outerHTML}</body></html>`);
    pw.document.close();
    pw.onload = () => setTimeout(() => pw.print(), 250);
  }
}

function shareBill(bill) {
  let text = `${state.settings?.business_name || 'SHAHI'}\n`;
  if (state.settings?.business_address) text += `${state.settings.business_address}\n`;
  if (state.settings?.business_phone) text += `${state.settings.business_phone}\n`;
  text += `\nBill: ${bill.bill_number}\n${formatDateTime(bill.created_at)}\nCustomer: ${bill.customer_name_snapshot}\nItems:\n`;
  bill.items?.forEach(i => { text += `${i.product_name_snapshot} ${i.pack_name_snapshot} × ${i.quantity}  ${formatCurrency(i.unit_rate_snapshot)}  ${formatCurrency(i.line_total)}\n`; });
  text += `\nTOTAL: ${formatCurrency(bill.total)}\n\n${state.settings?.bill_footer || 'Thank you for your business!'}`;
  if (navigator.share) return navigator.share({ title: `Bill ${bill.bill_number}`, text });
  return navigator.clipboard.writeText(text).then(() => toast.success('Copied'));
}

function openWhatsApp(bill) {
  const num = (state.settings?.whatsapp_number || '').replace(/\D/g, '');
  const text = encodeURIComponent(generateBillText(bill));
  window.open(num ? `https://wa.me/${num}?text=${text}` : `https://wa.me/?text=${text}`, '_blank');
}

function generateBillText(bill) {
  const s = state.settings || {};
  let t = `${s.business_name || 'SHAHI'}\n${s.business_address || ''}\n${s.business_phone || ''}\n\nBill: ${bill.bill_number}\n${formatDateTime(bill.created_at)}\nCustomer: ${bill.customer_name_snapshot}\nItems:\n`;
  bill.items?.forEach(i => { t += `${i.product_name_snapshot} ${i.pack_name_snapshot} × ${i.quantity}  ${formatCurrency(i.unit_rate_snapshot)}  ${formatCurrency(i.line_total)}\n`; });
  t += `\nTOTAL: ${formatCurrency(bill.total)}\n\n${s.bill_footer || 'Thank you for your business!'}`;
  return t;
}

// ============================================
// VIEW: CUSTOMERS LIST
// ============================================
async function initViewCustomers() {
  await loadCustomersCache();
  renderCustomersList();
}

async function loadCustomersCache() {
  try {
    const { data, error } = await apiGet('customers', { order: 'name.asc' });
    if (error) throw error;
    state.customers = data || [];
  } catch (e) {
    state.customers = [];
    toast.error('Failed to load customers');
  }
}

function renderCustomersList() {
  const container = $('#customers-list');
  if (!container) return;
  const list = state.customers || [];
  if (!list.length) {
    container.innerHTML = `<div class="empty-state" style="padding:48px 16px;"><svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg><div class="empty-state__title">No customers yet</div><p class="empty-state__text">Add your first customer</p><button class="btn btn--primary" onclick="navigateTo('customers-form')">Add Customer</button></div>`;
    return;
  }
  container.innerHTML = list.map(c => `
    <a href="#customers/${c.id}" class="list-item" style="text-decoration:none;color:inherit;">
      <div style="width:48px;height:48px;border-radius:50%;background:#fef2f2;display:flex;align-items:center;justify-content:center;color:#b91c1c;font-weight:700;font-size:18px;flex-shrink:0;">${c.name.charAt(0).toUpperCase()}</div>
      <div class="list-item__content">
        <div class="list-item__title">${c.name}</div>
        <div class="list-item__subtitle">${c.mobile}${c.address ? ' • ' + c.address : ''}</div>
      </div>
      <div class="list-item__meta"><span class="badge ${c.active ? 'badge--success' : 'badge--archive'}">${c.active ? 'Active' : 'Archived'}</span></div>
    </a>
  `).join('');

  $('#customers-search')?.addEventListener('input', SHAHI.debounce(() => {
    const term = $('#customers-search').value.toLowerCase();
    $$('#customers-list .list-item').forEach(item => {
      const t = item.textContent.toLowerCase();
      item.style.display = t.includes(term) ? 'flex' : 'none';
    });
  }, 200));
}

// ============================================
// VIEW: CUSTOMER FORM (New/Edit)
// ============================================
async function initViewCustomersForm(id) {
  state.currentCustomerId = id || null;
  const isNew = !id;
  $('#customer-form-title').textContent = isNew ? 'New Customer' : 'Edit Customer';
  $('#customer-rates-display')?.style.display = isNew ? 'none' : 'block';

  const form = $('#customer-form');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      await saveCustomer(form, isNew);
    };
  }

  $('#btn-edit-rates')?.onclick = () => openRatesEditor(state.currentCustomerId);

  if (!isNew) {
    await loadCustomerDetail(id, form);
  }
}

function resetCustomerForm() {
  $('#customer-form')?.reset();
  $('#customer-active').checked = true;
  $('#customer-form').dataset.customerId = '';
  $('#customer-rates-display').innerHTML = '<p style="color:#8e8e93;font-size:13px;">No custom rates set.</p>';
}

async function loadCustomerDetail(id, form) {
  try {
    const { data, error } = await apiGet('customers', { id: `eq.${id}`, single: true });
    if (error) throw error;
    if (!data) throw new Error('Customer not found');
    populateCustomerForm(form, data);
    await loadCustomerRatesDisplay(id);
    $('#btn-edit-rates')?.onclick = () => openRatesEditor(id);
  } catch (e) {
    toast.error('Failed to load customer');
  }
}

function populateCustomerForm(form, c) {
  form.dataset.customerId = c.id;
  $('#customer-name').value = c.name || '';
  $('#customer-mobile').value = c.mobile || '';
  $('#customer-address').value = c.address || '';
  $('#customer-email').value = c.email || '';
  $('#customer-gstin').value = c.gstin || '';
  $('#customer-credit-limit').value = c.credit_limit || 0;
  $('#customer-payment-terms').value = c.payment_terms_days || 0;
  $('#customer-active').checked = c.active !== false;
}

async function saveCustomer(form, isNew) {
  const data = {
    name: $('#customer-name').value.trim(),
    mobile: $('#customer-mobile').value.trim(),
    address: $('#customer-address').value.trim() || null,
    email: $('#customer-email').value.trim() || null,
    gstin: $('#customer-gstin').value.trim() || null,
    credit_limit: parseNumber($('#customer-credit-limit').value),
    payment_terms_days: parseInt($('#customer-payment-terms').value) || 0,
    active: $('#customer-active').checked
  };
  if (!data.name || !data.mobile) { toast.error('Name and mobile required'); return; }

  loading.show();
  try {
    if (isNew) {
      const [c] = await apiPost('customers', data);
      state.customers.push(c);
      toast.success('Customer created');
      navigateTo('customers-form', c.id);
    } else {
      const id = form.dataset.customerId;
      await apiPatch('customers', id, data);
      const idx = state.customers.findIndex(c => c.id === id);
      if (idx >= 0) state.customers[idx] = { ...state.customers[idx], ...data };
      toast.success('Customer updated');
      renderCustomersList();
      navigateTo('customers-form', id);
    }
  } catch (e) {
    toast.error(e.message || 'Failed to save');
  } finally {
    loading.hide();
  }
}

async function loadCustomerRatesDisplay(customerId) {
  try {
    const { data, error } = await apiGet('customer_rates', {
      customer_id: `eq.${customerId}`,
      active: 'eq.true',
      select: 'product_variant_id,rate,product_variants(pack_name,product_id,products(name))'
    });
    if (error) throw error;
    renderCustomerRatesDisplay(data || []);
  } catch (e) {
    $('#customer-rates-display').innerHTML = '<p style="color:#8e8e93;font-size:13px;">Could not load rates.</p>';
  }
}

function renderCustomerRatesDisplay(rates) {
  const container = $('#customer-rates-display');
  if (!container) return;
  if (!rates.length) { container.innerHTML = '<p style="color:#8e8e93;font-size:13px;">No custom rates set.</p>'; return; }
  container.innerHTML = rates.map(r => {
    const v = r.product_variants;
    const p = v?.products;
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #c7c7cc;"><div><div style="font-weight:600;">${p?.name} - ${v?.pack_name}</div><div style="font-size:12px;color:#8e8e93;">Custom Rate</div></div><span style="font-weight:600;font-family:monospace;">${formatCurrency(r.rate)}</span></div>`;
  }).join('');
}

function openRatesEditor(customerId) {
  if (!customerId) return;
  const variants = state.products.filter(p => p.active).flatMap(p => (p.variants || []).filter(v => v.active).map(v => ({ ...v, productName: p.name })));
  const existing = {};
  state.customers.find(c => c.id === customerId);
  // Load existing rates
  apiGet('customer_rates', { customer_id: `eq.${customerId}`, active: 'eq.true' }).then(({ data }) => {
    (data || []).forEach(r => { existing[r.product_variant_id] = r.rate; });
    renderRatesEditorSheet(variants, existing, customerId);
  });
}

function renderRatesEditorSheet(variants, existing, customerId) {
  const s = sheet.createSheet(`
    <div style="margin-bottom:16px;"><div class="search-box"><input type="search" id="rates-search" class="form-input" placeholder="Search..."></div></div>
    <div id="rates-list" style="max-height:50vh;overflow-y:auto;">
      ${variants.map(v => {
        const ex = existing[v.id];
        return `<div class="card" style="margin-bottom:8px;border:none;background:#e5e5ea;" data-vid="${v.id}"><div class="card__body" style="padding:12px;"><div style="display:flex;justify-content:space-between;align-items:center;"><div><div style="font-weight:600;">${v.productName}</div><div style="font-size:12px;color:#8e8e93;">${v.pack_name}</div></div><div style="display:flex;align-items:center;gap:8px;"><label class="form-checkbox" style="margin:0;"><input type="checkbox" class="rate-enabled" data-vid="${v.id}" ${ex ? 'checked' : ''}><span>Custom</span></label><div class="input-group" style="width:120px;display:${ex ? 'flex' : 'none'}"><span class="input-group__addon">₹</span><input type="number" class="input-group__input rate-value" step="0.01" min="0" value="${ex || ''}" data-vid="${v.id}"></div></div></div></div></div>`;
      }).join('')}
    </div>
  `, { title: 'Edit Custom Rates', footer: `<button class="btn btn--outline btn--full" onclick="sheet.close()">Cancel</button><button class="btn btn--primary btn--full" onclick="saveCustomerRates('${customerId}')">Save Rates</button>` });

  $$('.rate-enabled', s.sheet).forEach(cb => {
    cb.onchange = () => {
      const g = cb.closest('.card').querySelector('.input-group');
      if (g) g.style.display = cb.checked ? 'flex' : 'none';
    };
  });
  $('#rates-search')?.addEventListener('input', SHAHI.debounce(() => {
    const term = $('#rates-search').value.toLowerCase();
    $$('[data-vid]', s.sheet).forEach(c => {
      const t = c.textContent.toLowerCase();
      c.style.display = t.includes(term) ? 'block' : 'none';
    });
  }, 150));
}

app.saveCustomerRates = async function(customerId) {
  const rates = [];
  $$('.rate-enabled:checked').forEach(cb => {
    const vid = cb.dataset.vid;
    const input = cb.closest('.card').querySelector('.rate-value');
    const rate = parseNumber(input?.value);
    if (rate > 0) rates.push({ customer_id: customerId, product_variant_id: vid, rate, active: true });
  });
  loading.show();
  try {
    const { data: existing } = await apiGet('customer_rates', { customer_id: `eq.${customerId}` });
    if (existing) {
      for (const r of existing) await apiPatch('customer_rates', r.id, { active: false });
    }
    if (rates.length) await apiPost('customer_rates', rates);
    sheet.close();
    toast.success('Rates saved');
    await loadCustomerRatesDisplay(customerId);
  } catch (e) {
    toast.error('Failed to save rates');
  } finally {
    loading.hide();
  }
};

app.openQuickCustomer = function() {
  const s = sheet.createSheet(`
    <form id="quick-customer-form">
      <div class="form-group"><label class="form-label">Name <span style="color:#ff3b30;">*</span></label><input type="text" id="qc-name" class="form-input" required placeholder="Customer name"></div>
      <div class="form-group"><label class="form-label">Mobile <span style="color:#ff3b30;">*</span></label><input type="tel" id="qc-mobile" class="form-input" required placeholder="Mobile number"></div>
      <div class="form-group"><label class="form-label">Address</label><textarea id="qc-address" class="form-textarea" rows="2" placeholder="Address"></textarea></div>
    </form>
  `, { title: 'Quick Add Customer', footer: `<button class="btn btn--outline btn--full" onclick="sheet.close()">Cancel</button><button class="btn btn--primary btn--full" onclick="app.saveQuickCustomer()">Create & Select</button>` });
  setTimeout(() => $('#qc-name')?.focus(), 100);
};

app.saveQuickCustomer = async function() {
  const name = $('#qc-name')?.value.trim();
  const mobile = $('#qc-mobile')?.value.trim();
  const address = $('#qc-address')?.value.trim();
  if (!name || !mobile) { toast.error('Name and mobile required'); return; }
  loading.show();
  try {
    const [c] = await apiPost('customers', { name, mobile, address, active: true });
    state.customers.push(c);
    selectOrderCustomer(c.id);
    sheet.close();
    toast.success('Customer created');
  } catch (e) { toast.error('Failed to create customer'); }
  finally { loading.hide(); }
};

// ============================================
// VIEW: PRODUCTS LIST
// ============================================
async function initViewProducts() {
  await loadProductsCache();
  renderProductsGrid();
}

async function loadProductsCache() {
  try {
    const [{ data: products }, { data: variants }, { data: images }] = await Promise.all([
      apiGet('products', { active: 'eq.true', order: 'name.asc' }),
      apiGet('product_variants', { active: 'eq.true', order: 'product_id,quantity.asc' }),
      apiGet('product_images', { active: 'eq.true' })
    ]);

    const variantMap = {};
    (variants || []).forEach(v => { if (!variantMap[v.product_id]) variantMap[v.product_id] = []; variantMap[v.product_id].push(v); });

    const imageMap = {};
    (images || []).forEach(img => {
      if (!imageMap[img.product_id]) imageMap[img.product_id] = { main: null, variants: {} };
      if (img.variant_id) imageMap[img.product_id].variants[img.variant_id] = img.image_url;
      else if (!imageMap[img.product_id].main) imageMap[img.product_id].main = img.image_url;
    });

    state.products = (products || []).map(p => ({
      ...p,
      variants: variantMap[p.id] || [],
      mainImage: imageMap[p.id]?.main || null
    }));
  } catch (e) {
    state.products = [];
    toast.error('Failed to load products');
  }
}

function renderProductsGrid() {
  const container = $('#products-grid');
  if (!container) return;
  const list = state.products.filter(p => p.active);
  if (!list.length) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1;padding:48px 16px;"><svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg><div class="empty-state__title">No products yet</div><p class="empty-state__text">Add your first product</p><button class="btn btn--primary" onclick="navigateTo('products-form')">Add Product</button></div>`;
    return;
  }
  container.innerHTML = list.map(p => `
    <article class="card product-card" onclick="navigateTo('product-detail', '${p.id}')" style="cursor:pointer;">
      <div class="product-card__image" style="width:100%;aspect-ratio:1;background:#e5e5ea;overflow:hidden;">
        ${p.mainImage ? `<img src="${p.mainImage}" style="width:100%;height:100%;object-fit:cover">` : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#8e8e93;"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></div>'}
      </div>
      <div class="product-card__info" style="padding:12px;">
        <h3 class="product-card__name" style="font-size:15px;font-weight:600;margin:0 0 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name}</h3>
        <div class="product-card__variants" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;">
          ${(p.variants || []).filter(v => v.active).map(v => `<span class="badge badge--primary">${v.pack_name} • ${formatCurrency(v.default_rate)}</span>`).join('')}
        </div>
        <div class="product-card__actions" style="display:flex;gap:8px;padding-top:12px;border-top:1px solid #c7c7cc;">
          <button class="btn btn--outline btn--sm" onclick="event.stopPropagation();navigateTo('product-detail','${p.id}')">View</button>
          ${can('manage_products') ? `<button class="btn btn--outline btn--sm" onclick="event.stopPropagation();editProduct('${p.id}')">Edit</button>` : ''}
          ${can('manage_products') ? `<button class="btn btn--ghost btn--sm btn--danger" onclick="event.stopPropagation();archiveProduct('${p.id}')">Archive</button>` : ''}
        </div>
      </div>
    </article>
  `).join('');

  $('#products-search')?.addEventListener('input', SHAHI.debounce(() => {
    const term = $('#products-search').value.toLowerCase();
    $$('.product-card', container).forEach(card => {
      const t = card.textContent.toLowerCase();
      card.style.display = t.includes(term) ? 'block' : 'none';
    });
  }, 200));
}

// ============================================
// VIEW: PRODUCT FORM
// ============================================
async function initViewProductsForm(id) {
  state.currentProductId = id || null;
  const isNew = !id;
  $('#product-form-title').textContent = isNew ? 'New Product' : 'Edit Product';

  resetProductForm();
  initSuggestedPacks();
  setupProductForm();

  if (!isNew) {
    const p = state.products.find(x => x.id === id);
    if (p) populateProductForm(p);
  }
}

function resetProductForm() {
  $('#product-form')?.reset();
  $('#custom-packs-container').innerHTML = '';
  $('#main-image-preview').innerHTML = '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';
  window.currentProductMainImage = null;
}

function initSuggestedPacks() {
  const container = $('#suggested-packs');
  if (!container) return;
  const suggested = window.SHAHI_CONFIG.suggestedPackSizes;
  container.innerHTML = suggested.map(p => `
    <label class="form-checkbox" style="flex:1;min-width:100px;padding:12px;background:#e5e5ea;border-radius:8px;border:1px solid #c7c7cc;cursor:pointer;text-align:center;">
      <input type="checkbox" name="suggested-pack" value="${p.pack_name}" data-qty="${p.quantity}" data-unit="${p.unit}" checked style="margin:0;">
      <span style="font-weight:600;display:block;margin-top:4px;">${p.pack_name}</span>
    </label>
  `).join('');
}

function setupProductForm() {
  $('#btn-add-custom-pack')?.onclick = () => addCustomPackRow();
  $('#product-form')?.onsubmit = async (e) => {
    e.preventDefault();
    await saveProduct();
  };
}

function addCustomPackRow(pack = {}) {
  const container = $('#custom-packs-container');
  if (!container) return;
  const rowId = generateId().slice(0, 8);
  const row = document.createElement('div');
  row.className = 'custom-pack-row';
  row.dataset.rowId = rowId;
  row.style.cssText = 'display:flex;gap:8px;align-items:flex-end;margin-bottom:8px;flex-wrap:wrap;';
  row.innerHTML = `
    <div style="flex:1;min-width:110px;"><label class="form-label" style="font-size:11px;">Pack Name</label><input type="text" class="form-input custom-pack-name" placeholder="e.g. 250g" value="${pack.pack_name || ''}" required></div>
    <div style="flex:1;min-width:80px;"><label class="form-label" style="font-size:11px;">Qty</label><input type="number" class="form-input custom-pack-qty" step="0.001" min="0.001" value="${pack.quantity || ''}" required></div>
    <div style="flex:1;min-width:80px;"><label class="form-label" style="font-size:11px;">Unit</label><select class="form-select custom-pack-unit"><option value="g" ${pack.unit === 'g' ? 'selected' : ''}>g</option><option value="kg" ${pack.unit === 'kg' ? 'selected' : ''}>kg</option><option value="pcs" ${pack.unit === 'pcs' ? 'selected' : ''}>pcs</option><option value="ml" ${pack.unit === 'ml' ? 'selected' : ''}>ml</option></select></div>
    <button type="button" class="btn btn--ghost btn--sm" style="align-self:flex-end;margin-bottom:1.5rem;" onclick="app.removeCustomPackRow('${rowId}')" aria-label="Remove"><svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
  `;
  container.appendChild(row);
}

app.removeCustomPackRow = function(rowId) {
  const row = $(`.custom-pack-row[data-row-id="${rowId}"]`);
  if (row) row.remove();
};

app.handleMainImageUpload = function(input) {
  const file = input.files?.[0];
  if (!file) return;
  const v = SHAHI.ImageUtils.validate(file);
  if (!v.valid) { toast.error(v.error); input.value = ''; return; }
  SHAHI.ImageUtils.compress(file, 800, 800, 0.85).then(blob => {
    const url = URL.createObjectURL(blob);
    window.currentProductMainImage = blob;
    $('#main-image-preview').innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover">`;
  });
};

function populateProductForm(p) {
  $('#product-name').value = p.name || '';
  $('#product-description').value = p.description || '';
  if (p.mainImage) {
    $('#main-image-preview').innerHTML = `<img src="${p.mainImage}" style="width:100%;height:100%;object-fit:cover">`;
  }
  const suggestedNames = ['50g', '500g', '1kg'];
  const custom = (p.variants || []).filter(v => !suggestedNames.includes(v.pack_name));
  custom.forEach(v => addCustomPackRow({ pack_name: v.pack_name, quantity: v.quantity, unit: v.unit }));
  renderProductRates(p);
}

function renderProductRates(product) {
  const container = $('#product-rates-list');
  if (!container) return;
  const list = (product.variants || []).filter(v => v.active);
  container.innerHTML = list.map(v => `
    <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #c7c7cc;">
      <div style="flex:1;min-width:0;"><div style="font-weight:600;">${v.pack_name}</div><div style="font-size:12px;color:#8e8e93;">${v.quantity} ${v.unit}</div></div>
      <div class="input-group" style="width:140px;"><span class="input-group__addon">₹</span><input type="number" class="input-group__input rate-input" step="0.01" min="0" value="${v.default_rate}" data-vid="${v.id}" required></div>
    </div>
  `).join('');
}

async function saveProduct() {
  const name = $('#product-name').value.trim();
  const description = $('#product-description').value.trim() || null;
  if (!name) { toast.error('Product name required'); return; }

  const packs = [];
  $$('input[name="suggested-pack"]:checked').forEach(cb => {
    packs.push({ pack_name: cb.value, quantity: parseNumber(cb.dataset.qty), unit: cb.dataset.unit });
  });
  $$('.custom-pack-row').forEach(row => {
    const pn = row.querySelector('.custom-pack-name').value.trim();
    const qty = parseNumber(row.querySelector('.custom-pack-qty').value);
    const unit = row.querySelector('.custom-pack-unit').value;
    if (pn && qty > 0) packs.push({ pack_name: pn, quantity: qty, unit });
  });
  if (!packs.length) { toast.error('At least one pack size required'); return; }

  loading.show();
  try {
    let productId = state.currentProductId;
    if (!productId) {
      const [product] = await apiPost('products', { name, description, active: true });
      productId = product.id;
      const variants = await apiPost('product_variants', packs.map(p => ({ product_id: productId, pack_name: p.pack_name, quantity: p.quantity, unit: p.unit, default_rate: 0, active: true })));
      if (window.currentProductMainImage instanceof Blob) {
        const path = `products/${productId}/main-${Date.now()}.jpg`;
        await window.supabase.uploadFile('product-images', path, window.currentProductMainImage);
        const url = window.supabase.getStorageUrl('product-images', path);
        await apiPost('product_images', { product_id: productId, image_url: url, sort_order: 0, active: true });
      }
      toast.success('Product created');
    } else {
      await apiPatch('products', productId, { name, description });
      const variants = state.products.find(p => p.id === productId)?.variants || [];
      $$('.rate-input').forEach(input => {
        const vid = input.dataset.vid;
        const rate = parseNumber(input.value);
        const v = variants.find(x => x.id === vid);
        if (v) apiPatch('product_variants', vid, { default_rate: rate });
      });
      toast.success('Product updated');
    }
    await loadProductsCache();
    navigateTo('product-detail', productId);
  } catch (e) {
    toast.error(e.message || 'Failed to save');
  } finally {
    loading.hide();
  }
}

// ============================================
// VIEW: PRODUCT DETAIL
// ============================================
async function initViewProductDetail(id) {
  try {
    const p = state.products.find(x => x.id === id);
    if (!p) {
      const { data, error } = await apiGet('products', { id: `eq.${id}`, single: true });
      if (error) throw error;
      if (!data) throw new Error('Product not found');
      state.products.push(data);
      renderProductDetailUI(data);
    } else {
      renderProductDetailUI(p);
    }
    state.currentProductId = id;
    $('#btn-edit-product')?.onclick = () => navigateTo('products-form', id);
    $('#btn-archive-product')?.onclick = () => archiveProduct(id);
  } catch (e) {
    toast.error('Failed to load product');
  }
}

function renderProductDetailUI(p) {
  const container = $('#view-product-detail');
  if (!container) return;
  container.innerHTML = `
    <section class="view-content" style="padding:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
        <h2 style="font-size:20px;font-weight:700;margin:0;">Product Details</h2>
        <div style="display:flex;gap:8px;">
          <button class="btn btn--outline" id="btn-edit-product" data-role-manager>Edit</button>
          <button class="btn btn--outline btn--danger" id="btn-archive-product" data-role-manager>Archive</button>
        </div>
      </div>
      <div class="card" style="margin-bottom:16px;">
        <div class="card__body" style="padding:16px;">
          <div style="display:flex;gap:16px;margin-bottom:16px;">
            <div style="width:100px;height:100px;border-radius:12px;background:#e5e5ea;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;">
              ${p.mainImage ? `<img src="${p.mainImage}" style="width:100%;height:100%;object-fit:cover">` : '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>'}
            </div>
            <div style="flex:1;min-width:0;">
              <h3 style="margin:0 0 4px;font-size:18px;">${p.name}</h3>
              ${p.description ? `<p style="margin:0;color:#8e8e93;font-size:13px;">${p.description}</p>` : ''}
            </div>
          </div>
          <div style="margin-bottom:16px;">
            <h4 style="font-size:13px;font-weight:600;color:#8e8e93;margin-bottom:8px;text-transform:uppercase;">Variants & Rates</h4>
            <div class="list">
              ${(p.variants || []).filter(v => v.active).map(v => `
                <div class="list-item" style="padding:10px 0;border:none;background:none;">
                  <div class="list-item__content"><div class="list-item__title">${v.pack_name}</div><div class="list-item__subtitle">${v.quantity} ${v.unit}</div></div>
                  <div class="list-item__meta"><span class="primary" style="font-family:monospace;">${formatCurrency(v.default_rate)}</span></div>
                </div>
              `).join('')}
            </div>
          </div>
          <div>
            <h4 style="font-size:13px;font-weight:600;color:#8e8e93;margin-bottom:8px;text-transform:uppercase;">Status</h4>
            <div style="display:flex;gap:8px;"><span class="badge ${p.active ? 'badge--success' : 'badge--archive'}">${p.active ? 'Active' : 'Archived'}</span></div>
          </div>
        </div>
      </div>
    </section>`;
}

function editProduct(id) { navigateTo('products-form', id); }

async function archiveProduct(id) {
  if (!confirm('Archive this product? It will be hidden from new orders.')) return;
  loading.show();
  try {
    await apiPatch('products', id, { active: false, archived_at: new Date().toISOString() });
    await loadProductsCache();
    if (state.currentProductId === id) navigateTo('products');
    renderProductsGrid();
    toast.success('Product archived');
  } catch (e) { toast.error('Failed to archive'); }
  finally { loading.hide(); }
}

// ============================================
// VIEW: ADMIN
// ============================================
function initViewAdmin() {
  const isOwner = state.role === 'owner';
  $$('[data-role-owner]').forEach(el => el.style.display = isOwner ? '' : 'none');

  $$('.tab')?.forEach(btn => {
    btn.onclick = () => {
      $$('.tab').forEach(b => { b.classList.toggle('active', b === btn); b.setAttribute('aria-selected', b === btn); });
      $$('.tab-panel').forEach(p => { p.style.display = p.id === `tab-${btn.dataset.tab}` ? 'block' : 'none'; });
    };
  });

  initBusinessTab();
  initBillSettingsTab();
  initUsersTab();
}

function initBusinessTab() {
  const s = state.settings || {};
  $('#business-name').value = s.business_name || 'SHAHI';
  $('#business-address').value = s.business_address || '';
  $('#business-phone').value = s.business_phone || '';
  $('#business-gstin').value = s.business_gstin || '';
  $('#business-whatsapp').value = (s.whatsapp_number || '').replace(/\D/g, '');

  $('#business-form')?.onsubmit = async (e) => {
    e.preventDefault();
    loading.show();
    try {
      const settings = {
        business_name: $('#business-name').value.trim() || 'SHAHI',
        business_address: $('#business-address').value.trim(),
        business_phone: $('#business-phone').value.trim(),
        business_gstin: $('#business-gstin').value.trim(),
        whatsapp_number: $('#business-whatsapp').value.trim().replace(/\D/g, '')
      };
      for (const [k, v] of Object.entries(settings)) await saveSetting(k, v);
      toast.success('Saved');
    } catch (e) { toast.error('Failed'); }
    finally { loading.hide(); }
  };
}

function initBillSettingsTab() {
  const s = state.settings || {};
  const prefix = s.bill_prefix || 'SH';
  const year = new Date().getFullYear();
  $('#bill-prefix').value = prefix;
  $('#bill-prefix-preview').textContent = `-${year}-000001`;
  $('#bill-footer').value = s.bill_footer || '';
  $('#bill-note').value = s.bill_note || '';

  $('#bill-prefix')?.oninput = () => {
    $('#bill-prefix').value = $('#bill-prefix').value.toUpperCase().slice(0, 4);
    $('#bill-prefix-preview').textContent = `-${year}-000001`;
  };

  $('#bill-settings-form')?.onsubmit = async (e) => {
    e.preventDefault();
    loading.show();
    try {
      const settings = {
        bill_prefix: $('#bill-prefix').value.trim().toUpperCase() || 'SH',
        bill_footer: $('#bill-footer').value.trim(),
        bill_note: $('#bill-note').value.trim()
      };
      for (const [k, v] of Object.entries(settings)) await saveSetting(k, v);
      toast.success('Saved');
    } catch (e) { toast.error('Failed'); }
    finally { loading.hide(); }
  };
}

function initUsersTab() {
  $('#btn-add-user')?.onclick = () => {
    sheet.createSheet(`
      <form id="invite-user-form">
        <div class="form-group"><label class="form-label">Email <span style="color:#ff3b30;">*</span></label><input type="email" id="invite-email" class="form-input" required placeholder="user@example.com"></div>
        <div class="form-group"><label class="form-label">Full Name</label><input type="text" id="invite-name" class="form-input" placeholder="Optional"></div>
        <div class="form-group"><label class="form-label">Role <span style="color:#ff3b30;">*</span></label><select id="invite-role" class="form-select" required><option value="staff">Staff (Order creation only)</option><option value="manager">Manager (Products, Customers, Rates)</option></select></div>
      </form>
    `, { title: 'Invite Team Member', footer: `<button class="btn btn--outline btn--full" onclick="sheet.close()">Cancel</button><button class="btn btn--primary btn--full" onclick="app.sendInvite()">Send Invite</button>` });
  };
}

app.sendInvite = async function() {
  const email = $('#invite-email')?.value.trim();
  const name = $('#invite-name')?.value.trim();
  const role = $('#invite-role')?.value;
  if (!email || !role) { toast.error('Email and role required'); return; }
  loading.show();
  try {
    await apiPost('users', { email, full_name: name || '', role, active: true });
    sheet.close();
    toast.success('User added');
  } catch (e) { toast.error(e.message || 'Failed'); }
  finally { loading.hide(); }
};

// ============================================
// BOOT
// ============================================
async function boot() {
  await initAuth();
  await loadSettings();

  window.addEventListener('hashchange', handleHashChange);
  handleHashChange();

  // Network detection
  const updateOnline = () => {
    let banner = $('#offline-banner');
    if (!navigator.onLine) {
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'offline-banner';
        banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#ff9500;color:#fff;text-align:center;padding:6px;font-size:13px;z-index:500;font-weight:600;';
        banner.textContent = 'You are offline. Changes sync when reconnected.';
        document.body.prepend(banner);
      }
    } else { banner?.remove(); }
  };
  window.addEventListener('online', updateOnline);
  window.addEventListener('offline', updateOnline);
  updateOnline();

  console.log('SHAHI App ready');
}

document.addEventListener('DOMContentLoaded', boot);

// Expose globally for inline handlers
window.navigateTo = navigateTo;
window.app = app;