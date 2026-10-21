/* SHAHI — Home View (Native App Style) */

async function initViewHome() {
  await loadDashboardStats();
  await loadRecentOrders();
}

function renderViewHome() {
  return `
    <section class="view-content" style="padding: var(--space-4);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-5);">
        <h2 style="font-size: var(--text-xl); font-weight: var(--font-bold); margin: 0;">Dashboard</h2>
        <button class="btn btn--primary btn--sm" onclick="location.hash='#orders/new'">
          <svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Order
        </button>
      </div>

      <!-- Stats Cards -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); margin-bottom: var(--space-5);">
        <article class="card" style="background: linear-gradient(135deg, var(--brand-red), var(--brand-red-dark)); color: white; border: none;">
          <div class="card__body" style="padding: var(--space-5);">
            <div style="font-size: var(--text-sm); opacity: 0.9; margin-bottom: var(--space-1);">Today's Orders</div>
            <div id="stat-orders" style="font-size: 34px; font-weight: var(--font-bold); line-height: 1;">—</div>
          </div>
        </article>
        <article class="card" style="background: linear-gradient(135deg, #1c1c1e, #2c2c2e); color: white; border: none;">
          <div class="card__body" style="padding: var(--space-5);">
            <div style="font-size: var(--text-sm); opacity: 0.9; margin-bottom: var(--space-1);">Today's Sales</div>
            <div id="stat-sales" style="font-size: 34px; font-weight: var(--font-bold); line-height: 1;">—</div>
          </div>
        </article>
      </div>

      <!-- Quick Actions -->
      <div class="card" style="margin-bottom: var(--space-5);">
        <div class="card__body" style="padding: var(--space-4);">
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-3);">
            <button class="btn btn--outline btn--full" style="flex-direction: column; gap: var(--space-2); padding: var(--space-4) var(--space-3);" onclick="location.hash='#products/new'" ${!can('manage_products') ? 'disabled' : ''}>
              <svg class="btn__icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7L9 18l-5-5"/></svg>
              <span style="font-size: var(--text-sm); font-weight: var(--font-medium);">Add Product</span>
            </button>
            <button class="btn btn--outline btn--full" style="flex-direction: column; gap: var(--space-2); padding: var(--space-4) var(--space-3);" onclick="location.hash='#customers/new'" ${!can('manage_products') ? 'disabled' : ''}>
              <svg class="btn__icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/></svg>
              <span style="font-size: var(--text-sm); font-weight: var(--font-medium);">Add Customer</span>
            </button>
          </div>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-3); margin-top: var(--space-3);">
            <button class="btn btn--outline btn--full" style="flex-direction: column; gap: var(--space-2); padding: var(--space-4) var(--space-3);" onclick="location.hash='#products'">
              <svg class="btn__icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              <span style="font-size: var(--text-sm); font-weight: var(--font-medium);">Products</span>
            </button>
            <button class="btn btn--outline btn--full" style="flex-direction: column; gap: var(--space-2); padding: var(--space-4) var(--space-3);" onclick="location.hash='#admin'" data-role-owner>
              <svg class="btn__icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><path d="M1 9h2M17 9h2M1 14h2M17 14h2M7 18h1M4 18h1M20 18h1M15 18h1M10 12h1M13 12h1"/></svg>
              <span style="font-size: var(--text-sm); font-weight: var(--font-medium);">Settings</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Recent Orders -->
      <div class="card">
        <div class="card__header">
          <h3 class="card__title">Recent Orders</h3>
          <a href="#orders" style="font-size: var(--text-sm); font-weight: var(--font-medium); color: var(--brand-red);">View All</a>
        </div>
        <div class="card__body" id="recent-orders-list" style="padding: 0;">
          <!-- Populated by JS -->
        </div>
      </div>
    </section>
  `;
}

async function loadDashboardStats() {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const q = `created_at=gte.${today.toISOString()}&created_at=lt.${tomorrow.toISOString()}&select=id,total&order=created_at.desc`;
    
    const [{ data: orders }, { data: _ }] = await Promise.all([
      apiGet('orders', { created_at: `gte.${today.toISOString()}`, created_at: `lt.${tomorrow.toISOString()}`, select: 'id,total', order: 'created_at.desc' }),
      apiGet('orders', { created_at: `gte.${today.toISOString()}`, created_at: `lt.${tomorrow.toISOString()}`, select: 'total' })
    ]);
    
    const list = orders || [];
    const sales = list.reduce((s, o) => s + parseNumber(o.total), 0);
    
    $('#stat-orders').textContent = list.length;
    $('#stat-sales').textContent = formatCurrency(sales);
  } catch (e) {
    $('#stat-orders').textContent = '—';
    $('#stat-sales').textContent = '—';
  }
}

async function loadRecentOrders() {
  try {
    const { data, error } = await apiGet('orders', {
      select: 'id,bill_number,customer_name_snapshot,total,created_at',
      order: 'created_at.desc',
      limit: 5
    });
    if (error) throw error;
    
    const container = $('#recent-orders-list');
    if (!container) return;
    
    if (!data || !data.length) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 48px 16px;">
          <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <div class="empty-state__title">No orders yet</div>
          <p class="empty-state__text">Create your first order</p>
          <button class="btn btn--primary" onclick="location.hash='#orders/new'">Create Order</button>
        </div>
      `;
      return;
    }
    
    container.innerHTML = data.map(order => `
      <a href="#orders/${order.id}" class="list-item" style="text-decoration: none; color: inherit;">
        <div style="width: 40px; height: 40px; border-radius: var(--radius-md); background: var(--brand-red-light); display: flex; align-items: center; justify-content: center; color: var(--brand-red-dark); font-weight: var(--font-bold); font-size: 14px; flex-shrink: 0;">
          ${order.bill_number?.split('-').pop() || '#'}
        </div>
        <div class="list-item__content">
          <div class="list-item__title">${order.bill_number}</div>
          <div class="list-item__subtitle">${order.customer_name_snapshot} • ${formatDateTime(order.created_at)}</div>
        </div>
        <div class="list-item__meta">${formatCurrency(order.total)}</div>
      </a>
    `).join('');
  } catch (e) {
    console.error('Recent orders error:', e);
  }
}

window.initViewHome = initViewHome;
window.renderViewHome = renderViewHome;