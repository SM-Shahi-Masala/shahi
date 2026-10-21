/* SHAHI — App Bootstrap & Navigation (Native App Feel) */

// ============================================
// GLOBAL STATE
// ============================================
const AppState = new SHAHI.Store({
  user: null,
  profile: null,
  role: null,
  permissions: {},
  settings: {},
  currentView: 'home',
  viewHistory: ['home']
});

// ============================================
// VIEW RENDERER (Slide transitions like native app)
// ============================================
class ViewRenderer {
  constructor(containerId) {
    this.container = $(containerId);
    this.currentView = null;
    this.params = {};
  }

  render(viewName, params = {}, direction = 'forward') {
    // Build view HTML
    const viewHtml = this.buildView(viewName, params);
    if (!viewHtml) return;

    // Create view element
    const viewEl = document.createElement('div');
    viewEl.className = `view ${direction === 'forward' ? 'view-entering' : 'view-leaving'}`;
    viewEl.id = `view-${viewName}`;
    viewEl.innerHTML = viewHtml;

    // If there's a current view, slide it out
    const oldView = this.container.querySelector('.view.active');
    
    if (oldView && oldView.id !== viewEl.id) {
      oldView.classList.remove('active');
      oldView.classList.add(direction === 'forward' ? 'view-exiting-forward' : 'view-exiting-back');
      
      // Append new view
      this.container.appendChild(viewEl);
      
      // Trigger reflow then animate
      requestAnimationFrame(() => {
        viewEl.classList.remove('view-entering');
        viewEl.classList.add('active', 'view-entered');
        oldView.classList.add(direction === 'forward' ? 'view-exited-forward' : 'view-exited-back');
      });

      // Cleanup old view after transition
      setTimeout(() => {
        oldView.remove();
      }, 300);
    } else {
      // First load or same view
      this.container.innerHTML = '';
      this.container.appendChild(viewEl);
      requestAnimationFrame(() => {
        viewEl.classList.add('active');
      });
    }

    this.currentView = viewName;
    this.params = params;
    AppState.set('currentView', viewName);
    
    // Update history
    if (direction === 'forward' && AppState.get('viewHistory').slice(-1)[0] !== viewName) {
      AppState.update('viewHistory', h => [...h, viewName]);
    }

    // Call view init
    setTimeout(() => {
      if (window[`initView${capitalize(viewName)}`]) {
        window[`initView${capitalize(viewName)}`](params);
      }
    }, 50);
  }

  back() {
    const history = AppState.get('viewHistory');
    if (history.length > 1) {
      history.pop();
      const prev = history.slice(-1)[0];
      window.location.hash = `#/${prev}`;
    } else {
      window.location.hash = '#/home';
    }
  }

  buildView(viewName, params) {
    const renderFn = window[`renderView${capitalize(viewName)}`];
    return renderFn ? renderFn(params) : null;
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const viewRenderer = new ViewRenderer('#view-container');

// ============================================
// INITIALIZATION
// ============================================
async function initApp() {
  // Service Worker
  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('/sw.js'); } catch (e) {}
  }

  // Supabase
  window.supabase = new SHAHI.SupabaseClient(
    window.SHAHI_CONFIG?.supabaseUrl || '',
    window.SHAHI_CONFIG?.supabaseAnonKey || ''
  );

  // Session
  const session = await window.supabase.getSession();
  if (session) {
    const { data: { user } } = await window.supabase.getUser();
    if (user) await loadUserProfile(user.id);
  }

  // Managers
  window.toast = new SHAHI.ToastManager($('#toast-container'));
  window.loading = new SHAHI.LoadingManager($('#loading-overlay'));
  window.sheet = new SHAHI.SheetManager();

  // Router
  window.router = new SHAHI.Router({
    '/': () => navigateTo('home', {}),
    '/home': () => navigateTo('home', {}),
    '/orders': () => navigateTo('orders', {}),
    '/orders/new': () => navigateTo('orders', { newOrder: true }),
    '/orders/:id': (p) => navigateTo('orders', { orderId: p.id }),
    '/customers': () => navigateTo('customers', {}),
    '/customers/new': () => navigateTo('customers', { newCustomer: true }),
    '/customers/:id': (p) => navigateTo('customers', { customerId: p.id }),
    '/products': () => navigateTo('products', {}),
    '/products/new': () => navigateTo('products', { newProduct: true }),
    '/products/:id': (p) => navigateTo('products', { productId: p.id }),
    '/admin': () => navigateTo('admin', {}),
    '/admin/settings': () => navigateTo('admin', { tab: 'settings' }),
    '/admin/users': () => navigateTo('admin', { tab: 'users' }),
    '/admin/business': () => navigateTo('admin', { tab: 'business' })
  });

  // Bottom Nav
  setupBottomNav();

  // Header actions
  setupHeader();

  // FAB
  $('#fab-primary')?.addEventListener('click', () => {
    location.hash = '#/orders/new';
  });

  // Load settings
  await loadSettings();

  // Initial route
  const hash = window.location.hash.slice(1) || '/';
  window.router.navigate(hash, false);

  // Network
  setupNetworkDetection();

  console.log('SHAHI App initialized');
}

// ============================================
// NAVIGATION HELPER
// ============================================
function navigateTo(viewName, params = {}) {
  // Determine direction based on view
  const forwardViews = ['orders/new', 'customers/new', 'products/new'];
  const isDetail = params.orderId || params.customerId || params.productId;
  const direction = (params.newOrder || params.newCustomer || params.newProduct || isDetail) ? 'forward' : 'back';
  
  viewRenderer.render(viewName, params, direction);
  
  // Update header title
  updateHeaderTitle(viewName, params);
}

function updateHeaderTitle(viewName, params) {
  const title = $('.app-title');
  if (!title) return;
  const titles = {
    home: 'SHAHI',
    orders: params.newOrder ? 'New Order' : params.orderId ? 'Bill Details' : 'Orders',
    customers: params.newCustomer ? 'New Customer' : params.customerId ? 'Customer Details' : 'Customers',
    products: params.newProduct ? 'New Product' : params.productId ? 'Product Details' : 'Products',
    admin: 'Settings'
  };
  title.textContent = titles[viewName] || 'SHAHI';
}

// ============================================
// BOTTOM NAV
// ============================================
function setupBottomNav() {
  $$('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const nav = btn.dataset.nav;
      if (!nav) return;
      
      // Update active state
      $$('.nav-item').forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-current', b === btn ? 'page' : null);
      });
      
      // Hide FAB on admin
      const fab = $('#fab-primary');
      if (fab) fab.style.display = nav === 'admin' ? 'none' : 'flex';
      
      window.location.hash = `#/${nav}`;
    });
  });
}

// ============================================
// HEADER
// ============================================
function setupHeader() {
  // FAB visibility based on current view
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.slice(1);
    const fab = $('#fab-primary');
    const btnNewOrder = $('#btn-new-order');
    
    if (fab) fab.style.display = hash === '#/admin' ? 'none' : 'flex';
    if (btnNewOrder) btnNewOrder.style.display = (hash === '#/home' || hash === '#/') ? 'flex' : 'none';
    
    // Update nav active
    const navName = hash.replace('#/', '') || 'home';
    $$('.nav-item').forEach(b => {
      const active = b.dataset.nav === navName;
      b.classList.toggle('active', active);
      b.setAttribute('aria-current', active ? 'page' : null);
    });
  });
  
  // New order from header
  $('#btn-new-order')?.addEventListener('click', () => {
    location.hash = '#/orders/new';
  });
}

// ============================================
// AUTH
// ============================================
async function loadUserProfile(userId) {
  try {
    const { data: profile, error } = await window.supabase.select('users', { id: `eq.${userId}`, single: true });
    if (error) throw error;
    AppState.set('user', { id: userId, email: profile?.email });
    AppState.set('profile', profile);
    AppState.set('role', profile?.role || 'staff');
    AppState.set('permissions', profile?.permissions || {});
    updateUIForRole();
  } catch (e) {
    await signOut();
  }
}

function updateUIForRole() {
  const role = AppState.get('role');
  const isOwner = role === 'owner';
  const isManager = role === 'manager';
  $$('[data-role-owner]').forEach(el => el.style.display = isOwner ? '' : 'none');
  $$('[data-role-manager]').forEach(el => el.style.display = (isOwner || isManager) ? '' : 'none');
}

async function signOut() {
  await window.supabase.signOut();
  AppState.set('user', null);
  AppState.set('profile', null);
  AppState.set('role', null);
  AppState.set('permissions', {});
  location.hash = '#/';
  location.reload();
}

// ============================================
// SETTINGS
// ============================================
async function loadSettings() {
  try {
    const { data, error } = await window.supabase.select('settings');
    if (error) throw error;
    const settings = {};
    data?.forEach(s => { settings[s.key] = s.value; });
    AppState.set('settings', settings);
  } catch (e) {}
}

async function saveSetting(key, value) {
  try {
    await window.supabase.upsert('settings', { key, value }, 'key');
    AppState.update('settings', s => ({ ...s, [key]: value }));
    return true;
  } catch (e) { return false; }
}

// ============================================
// API HELPERS
// ============================================
async function apiGet(table, query = {}) { return window.supabase.select(table, query); }
async function apiPost(table, data) { return window.supabase.insert(table, data); }
async function apiPatch(table, id, data) { return window.supabase.update(table, id, data); }
async function apiDelete(table, id) { return window.supabase.delete(table, id); }
async function apiRpc(fn, params) { return window.supabase.rpc(fn, params); }

function can(action) {
  const role = AppState.get('role');
  const permissions = AppState.get('permissions');
  if (role === 'owner') return true;
  return permissions[action] === true;
}

// ============================================
// PRINT / SHARE / WHATSAPP
// ============================================
function printElement(el) {
  const pw = window.open('', '_blank');
  pw.document.write(`<html><head><link rel="stylesheet" href="/css/app.css"><style>@media print{@page{margin:0}body{padding:20mm}}${document.querySelector('style')?.innerHTML || ''}</style></head><body>${el.outerHTML}</body></html>`);
  pw.document.close();
  pw.onload = () => setTimeout(() => pw.print(), 250);
}

function generateBillText(bill) {
  const s = AppState.get('settings');
  let t = `${s.business_name || 'SHAHI'}\n${s.business_address || ''}\n${s.business_phone || ''}\n\nBill: ${bill.bill_number}\n${formatDateTime(bill.created_at)}\nCustomer: ${bill.customer_name_snapshot}\nItems:\n`;
  bill.items?.forEach(i => { t += `${i.product_name_snapshot} ${i.pack_name_snapshot} × ${i.quantity}  ${formatCurrency(i.unit_rate_snapshot)}  ${formatCurrency(i.line_total)}\n`; });
  t += `\nTOTAL: ${formatCurrency(bill.total)}\n\n${s.bill_footer || 'Thank you for your business!'}`;
  return t;
}

function shareBill(bill) {
  const text = generateBillText(bill);
  if (navigator.share) return navigator.share({ title: `Bill ${bill.bill_number}`, text });
  return navigator.clipboard.writeText(text).then(() => window.toast?.success('Copied'));
}

function openWhatsApp(bill) {
  const s = AppState.get('settings');
  const num = s.whatsapp_number || '';
  const text = encodeURIComponent(generateBillText(bill));
  window.open(num ? `https://wa.me/${num}?text=${text}` : `https://wa.me/?text=${text}`, '_blank');
}

// ============================================
// NETWORK
// ============================================
function setupNetworkDetection() {
  const update = () => {
    let banner = $('#offline-banner');
    if (!navigator.onLine) {
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'offline-banner';
        banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#ff9500;color:#fff;text-align:center;padding:6px;font-size:13px;z-index:500;font-weight:600;';
        banner.textContent = 'You are offline. Changes will sync when reconnected.';
        document.body.prepend(banner);
      }
    } else { banner?.remove(); }
  };
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
}

// ============================================
// BOOT
// ============================================
document.addEventListener('DOMContentLoaded', initApp);

// Exports
window.AppState = AppState;
window.can = can;
window.apiGet = apiGet;
window.apiPost = apiPost;
window.apiPatch = apiPatch;
window.apiDelete = apiDelete;
window.apiRpc = apiRpc;
window.printElement = printElement;
window.shareBill = shareBill;
window.openWhatsApp = openWhatsApp;
window.formatCurrency = SHAHI.formatCurrency;
window.formatDate = SHAHI.formatDate;
window.formatDateTime = SHAHI.formatDateTime;
window.navigateTo = navigateTo;
window.viewRenderer = viewRenderer;