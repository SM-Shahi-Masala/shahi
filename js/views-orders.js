/* SHAHI — Orders View (Native App Style) */

let currentOrderItems = [];
let currentCustomer = null;
let customersCache = [];
let productsCache = [];

function renderViewOrders(params = {}) {
  if (params.newOrder) return renderNewOrder();
  if (params.orderId) return renderOrderDetail();
  return renderOrdersList();
}

function renderOrdersList() {
  return `
    <section class="view-content" style="padding: var(--space-4);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
        <h2 style="font-size: var(--text-xl); font-weight: var(--font-bold); margin: 0;">Orders</h2>
        <button class="btn btn--primary" onclick="location.hash='#orders/new'">
          <svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Order
        </button>
      </div>

      <div class="card" style="margin-bottom: var(--space-4);">
        <div class="card__body" style="padding: var(--space-4);">
          <div class="search-box">
            <input type="search" id="orders-search" class="form-input" placeholder="Search orders..." aria-label="Search orders">
          </div>
        </div>
      </div>

      <div id="orders-list" class="list">
        <!-- Populated by JS -->
      </div>
    </section>
  `;
}

function renderNewOrder() {
  return `
    <section class="view-content" style="padding: var(--space-4);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
        <h2 style="font-size: var(--text-xl); font-weight: var(--font-bold); margin: 0;">New Order</h2>
      </div>

      <form id="order-form">
        <!-- Customer -->
        <div class="card" style="margin-bottom: var(--space-4);">
          <div class="card__body" style="padding: var(--space-4);">
            <label class="form-label" for="order-customer">Customer <span style="color: var(--color-error);">*</span></label>
            <div class="search-box" style="position: relative;">
              <input type="search" id="order-customer" class="form-input" placeholder="Search or select customer..." required>
              <button type="button" class="search-box__clear" aria-label="Clear" style="display: none;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <button type="button" class="btn btn--ghost btn--sm mt-3" onclick="openCustomerQuickCreate()">
              <svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add New Customer
            </button>
          </div>
        </div>

        <!-- Items -->
        <div class="card" style="margin-bottom: var(--space-4);">
          <div class="card__header">
            <h3 class="card__title">Order Items</h3>
            <button type="button" class="btn btn--ghost btn--sm" id="btn-add-item">
              <svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Product
            </button>
          </div>
          <div class="card__body" style="padding: 0;">
            <div id="order-items-container"></div>
            <div id="order-empty-state" class="empty-state" style="padding: 32px 16px;">
              <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              <div class="empty-state__title">No items added</div>
              <p class="empty-state__text">Tap "Add Product" to start</p>
            </div>
          </div>
        </div>

        <!-- Total -->
        <div class="card" style="margin-bottom: var(--space-4); background: #000; border-color: #1c1c1e; color: #fff;">
          <div class="card__body" style="padding: var(--space-5);">
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <span style="font-size: var(--text-sm); opacity: 0.8;">Order Total</span>
              <span id="order-total" style="font-size: 32px; font-weight: var(--font-bold);">₹0.00</span>
            </div>
          </div>
        </div>

        <!-- Note -->
        <div class="card" style="margin-bottom: var(--space-4);">
          <div class="card__body" style="padding: var(--space-4);">
            <label class="form-label" for="order-note">Note (optional)</label>
            <textarea id="order-note" class="form-textarea" rows="2" placeholder="Add a note for this order..."></textarea>
          </div>
        </div>

        <div style="display: flex; gap: var(--space-3);">
          <button type="button" class="btn btn--outline btn--full" onclick="location.hash='#orders'">Cancel</button>
          <button type="submit" class="btn btn--primary btn--full btn--lg">Create Bill</button>
        </div>
      </form>
    </section>
  `;
}

function renderOrderDetail() {
  return `
    <section class="view-content" style="padding: var(--space-4);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4); flex-wrap: wrap; gap: var(--space-3);">
        <h2 style="font-size: var(--text-xl); font-weight: var(--font-bold); margin: 0;" id="order-detail-title">Bill Details</h2>
        <div style="display: flex; gap: var(--space-2);">
          <button class="btn btn--outline" id="btn-print-bill">
            <svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print
          </button>
          <button class="btn btn--outline" id="btn-share-bill">
            <svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Share
          </button>
          <button class="btn btn--primary" id="btn-whatsapp-bill">
            <svg class="btn__icon" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.466-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.42-3.782c-.065-.075-.12-.15-.185-.225-.065-.075-.13-.149-.195-.224-.065-.075-.12-.15-.185-.225-.065-.075-.12-.149-.185-.224-.065-.075-.12-.15-.185-.225-.065-.075-.12-.15-.185-.225"/></svg>
            WhatsApp
          </button>
        </div>
      </div>

      <div class="card" id="order-detail-content" style="padding: 0;">
        <!-- Populated by JS -->
      </div>
    </section>
  `;
}

async function initViewOrders(params = {}) {
  await Promise.all([loadCustomersCache(), loadProductsCache()]);

  const container = $('#view-container');
  const existing = container.querySelector('.view.active');
  if (existing) existing.remove();

  const viewEl = document.createElement('div');
  viewEl.className = 'view active';
  viewEl.id = 'view-orders';
  viewEl.innerHTML = renderViewOrders(params);
  container.appendChild(viewEl);

  if (params.newOrder) {
    await initNewOrderForm();
  } else if (params.orderId) {
    await loadOrderDetail(params.orderId);
  } else {
    await loadOrdersList();
  }
}

// ============================================
// ORDERS LIST
// ============================================
async function loadOrdersList() {
  try {
    const { data, error } = await apiGet('orders', {
      select: 'id,bill_number,customer_name_snapshot,total,created_at',
      order: 'created_at.desc',
      limit: 50
    });
    if (error) throw error;
    renderOrdersListUI(data || []);
  } catch (e) {
    window.toast?.error('Failed to load orders');
  }
}

function renderOrdersListUI(orders) {
  const container = $('#orders-list');
  if (!container) return;

  if (!orders.length) {
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

  container.innerHTML = orders.map(order => `
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

  const searchInput = $('#orders-search');
  if (searchInput) {
    searchInput.addEventListener('input', SHAHI.debounce(() => {
      const term = searchInput.value.toLowerCase();
      $$('#orders-list .list-item').forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(term) ? 'flex' : 'none';
      });
    }, 200));
  }
}

// ============================================
// NEW ORDER
// ============================================
async function initNewOrderForm() {
  currentOrderItems = [];
  currentCustomer = null;
  setupCustomerSelector();
  setupAddItemButton();
  setupOrderForm();
  updateOrderTotal();
  renderOrderItemsUI();
}

function setupCustomerSelector() {
  const input = $('#order-customer');
  const clearBtn = input?.nextElementSibling;
  if (!input) return;

  input.addEventListener('focus', () => showCustomerPicker(input));
  input.addEventListener('input', SHAHI.debounce(() => {
    const term = input.value.toLowerCase();
    filterCustomerPicker(term);
  }, 150));

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      input.value = '';
      clearBtn.style.display = 'none';
      currentCustomer = null;
      updateOrderItemsCustomerRates();
    });
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.customer-picker') && !e.target.closest('#order-customer')) {
      hideCustomerPicker();
    }
  });
}

function showCustomerPicker(input) {
  hideCustomerPicker();
  const picker = document.createElement('div');
  picker.className = 'customer-picker sheet';
  picker.style.cssText = 'position: fixed; bottom: 0; left: 0; right: 0; max-width: 500px; margin: 0 auto; border-radius: var(--radius-xl) var(--radius-xl) 0 0; transform: translateY(0); max-height: 60vh; display: flex; flex-direction: column; z-index: 300;';
  picker.innerHTML = `
    <div class="sheet__handle"></div>
    <div class="sheet__header">
      <h2 class="sheet__title">Select Customer</h2>
      <button class="sheet__close"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
    <div class="sheet__content" style="padding: var(--space-4);">
      <div class="search-box" style="margin-bottom: var(--space-4);">
        <input type="search" id="picker-customer-search" class="form-input" placeholder="Search customers...">
      </div>
      <div id="picker-customer-list" style="max-height: 40vh; overflow-y: auto;">
        ${customersCache.filter(c => c.active).map(c => `
          <button type="button" class="list-item" data-customer-id="${c.id}" style="border: none; background: none; padding: var(--space-4); border-bottom: 1px solid var(--separator);">
            <div class="list-item__content">
              <div class="list-item__title">${c.name}</div>
              <div class="list-item__subtitle">${c.mobile}${c.address ? ` • ${c.address}` : ''}</div>
            </div>
          </button>
        `).join('')}
        <button type="button" class="list-item" id="btn-quick-create-customer" style="border: none; background: var(--brand-red-light); color: var(--brand-red-dark); border-radius: var(--radius-md); margin-top: var(--space-3);">
          <svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span style="margin-left: var(--space-3); font-weight: var(--font-medium);">Create New Customer</span>
        </button>
      </div>
    </div>
  `;

  input.parentElement.style.position = 'relative';
  input.parentElement.appendChild(picker);

  picker.querySelector('.sheet__close')?.addEventListener('click', hideCustomerPicker);
  $$('[data-customer-id]', picker).forEach(btn => {
    btn.addEventListener('click', () => selectCustomer(btn.dataset.customerId));
  });
  $('#btn-quick-create-customer', picker)?.addEventListener('click', () => {
    hideCustomerPicker();
    openCustomerQuickCreate();
  });

  const searchInput = $('#picker-customer-search');
  if (searchInput) {
    searchInput.addEventListener('input', SHAHI.debounce(() => {
      const term = searchInput.value.toLowerCase();
      $$('[data-customer-id]', picker).forEach(btn => {
        const text = btn.textContent.toLowerCase();
        btn.style.display = text.includes(term) ? 'flex' : 'none';
      });
    }, 150));
  }
}

function filterCustomerPicker(term) {
  const picker = $('.customer-picker');
  if (!picker) return;
  $$('[data-customer-id]', picker).forEach(btn => {
    const text = btn.textContent.toLowerCase();
    btn.style.display = text.includes(term) ? 'flex' : 'none';
  });
}

function hideCustomerPicker() {
  const picker = $('.customer-picker');
  if (picker) picker.remove();
}

function selectCustomer(customerId) {
  const customer = customersCache.find(c => c.id === customerId);
  if (!customer) return;
  currentCustomer = customer;
  const input = $('#order-customer');
  if (input) {
    input.value = customer.name;
    input.nextElementSibling.style.display = 'block';
  }
  hideCustomerPicker();
  updateOrderItemsCustomerRates();
  updateOrderTotal();
}

function updateOrderItemsCustomerRates() {
  currentOrderItems.forEach((item, index) => {
    const rate = getApplicableRate(item.productVariantId);
    item.appliedRate = rate;
    const rateEl = $(`#item-rate-${index}`);
    const totalEl = $(`#item-total-${index}`);
    if (rateEl) rateEl.textContent = formatCurrency(rate);
    if (totalEl) totalEl.textContent = formatCurrency(round2(rate * item.quantity));
  });
  updateOrderTotal();
}

function getApplicableRate(variantId) {
  const variant = findVariant(variantId);
  return variant?.default_rate || 0;
}

function findVariant(variantId) {
  for (const product of productsCache) {
    const variant = product.variants?.find(v => v.id === variantId);
    if (variant) return variant;
  }
  return null;
}

function setupAddItemButton() {
  $('#btn-add-item')?.addEventListener('click', () => openProductPicker());
}

function openProductPicker() {
  const variants = productsCache
    .filter(p => p.active)
    .flatMap(p => (p.variants || []).filter(v => v.active).map(v => ({ ...v, productName: p.name, productId: p.id, mainImage: p.mainImage })));

  const sheet = window.sheet.createSheet(`
    <div style="margin-bottom: var(--space-4);">
      <div class="search-box">
        <input type="search" id="product-picker-search" class="form-input" placeholder="Search products...">
      </div>
    </div>
    <div id="product-picker-list" style="max-height: 50vh; overflow-y: auto;">
      ${variants.map(v => `
        <div class="card" style="margin-bottom: var(--space-3); border: none; background: var(--bg-secondary);" data-product-id="${v.productId}">
          <div class="card__body" style="padding: var(--space-3);">
            <div style="display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-2);">
              <div style="width: 44px; height: 44px; border-radius: var(--radius-md); background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0;">
                ${v.mainImage ? `<img src="${v.mainImage}" alt="" style="width: 100%; height: 100%; object-fit: cover;">` : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>'}
              </div>
              <div style="flex: 1; min-width: 0;">
                <div style="font-weight: var(--font-medium); font-size: var(--text-base); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${v.productName}</div>
                <div style="font-size: var(--text-sm); color: var(--text-tertiary);">${v.pack_name}</div>
              </div>
            </div>
            <button type="button" class="btn btn--primary btn--sm variant-select-btn" 
              data-product-id="${v.productId}" data-variant-id="${v.id}" 
              data-pack-name="${v.pack_name}" data-default-rate="${v.default_rate}"
              style="width: 100%;">
              Add ${v.pack_name} • ${formatCurrency(v.default_rate)}
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `, { title: 'Select Product', footer: '<button class="btn btn--outline btn--full" onclick="window.sheet.close()">Cancel</button>' });

  const searchInput = $('#product-picker-search');
  if (searchInput) {
    searchInput.addEventListener('input', SHAHI.debounce(() => {
      const term = searchInput.value.toLowerCase();
      $$('[data-product-id]', sheet.sheet).forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(term) ? 'block' : 'none';
      });
    }, 150));
  }

  $$('.variant-select-btn', sheet.sheet).forEach(btn => {
    btn.addEventListener('click', () => {
      addOrderItem({
        productId: btn.dataset.productId,
        productVariantId: btn.dataset.variantId,
        packName: btn.dataset.packName,
        defaultRate: parseNumber(btn.dataset.defaultRate),
        quantity: 1
      });
      window.sheet.close();
    });
  });
}

function addOrderItem(itemData) {
  const existingIndex = currentOrderItems.findIndex(i => i.productVariantId === itemData.productVariantId);
  if (existingIndex >= 0) {
    currentOrderItems[existingIndex].quantity += 1;
  } else {
    currentOrderItems.push({
      ...itemData,
      appliedRate: currentCustomer ? getApplicableRate(itemData.productVariantId) : itemData.defaultRate,
      tempId: SHAHI.generateId()
    });
  }
  renderOrderItemsUI();
  updateOrderTotal();
  $('#order-empty-state').style.display = 'none';
}

function renderOrderItemsUI() {
  const container = $('#order-items-container');
  if (!container) return;

  if (currentOrderItems.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = currentOrderItems.map((item, index) => `
    <div class="card" style="margin-bottom: var(--space-3); border: none; background: var(--bg-secondary);" data-temp-id="${item.tempId}">
      <div class="card__body" style="padding: var(--space-3);">
        <div style="display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-2);">
          <div style="width: 44px; height: 44px; border-radius: var(--radius-md); background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0;">
            ${item.productImage ? `<img src="${item.productImage}" alt="" style="width: 100%; height: 100%; object-fit: cover;">` : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>'}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: var(--font-medium); font-size: var(--text-base);">${item.productName || findProductName(item.productId)}</div>
            <div style="font-size: var(--text-sm); color: var(--text-tertiary);">${item.packName}</div>
          </div>
          <button type="button" class="btn btn--ghost btn--sm" onclick="removeOrderItem('${item.tempId}')" aria-label="Remove">
            <svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style="display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: var(--space-2);">
            <label class="form-label" style="margin: 0; font-size: var(--text-xs); color: var(--text-tertiary);">Qty</label>
            <div class="qty-control">
              <button type="button" class="qty-btn" onclick="updateItemQty('${item.tempId}', -1)" aria-label="Decrease">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
              <input type="number" class="qty-input" id="item-qty-${index}" value="${item.quantity}" min="1" max="999" onchange="updateItemQtyDirect('${item.tempId}', this.value)">
              <button type="button" class="qty-btn" onclick="updateItemQty('${item.tempId}', 1)" aria-label="Increase">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: var(--space-2);">
            <label class="form-label" style="margin: 0; font-size: var(--text-xs); color: var(--text-tertiary);">Rate</label>
            <span id="item-rate-${index}" style="font-weight: var(--font-semibold); font-family: var(--font-ui-mono);">${formatCurrency(item.appliedRate)}</span>
          </div>
          <div style="margin-left: auto; display: flex; align-items: center; gap: var(--space-2);">
            <span style="font-size: var(--text-sm); color: var(--text-tertiary);">Amount</span>
            <span id="item-total-${index}" style="font-weight: var(--font-semibold); font-family: var(--font-ui-mono);">${formatCurrency(round2(item.appliedRate * item.quantity))}</span>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function updateItemQty(tempId, delta) {
  const item = currentOrderItems.find(i => i.tempId === tempId);
  if (!item) return;
  item.quantity = clamp(item.quantity + delta, 1, 999);
  renderOrderItemsUI();
  updateOrderTotal();
}

function updateItemQtyDirect(tempId, value) {
  const item = currentOrderItems.find(i => i.tempId === tempId);
  if (!item) return;
  item.quantity = clamp(parseNumber(value), 1, 999);
  renderOrderItemsUI();
  updateOrderTotal();
}

function removeOrderItem(tempId) {
  currentOrderItems = currentOrderItems.filter(i => i.tempId !== tempId);
  renderOrderItemsUI();
  updateOrderTotal();
  if (currentOrderItems.length === 0) {
    $('#order-empty-state').style.display = 'block';
  }
}

function findProductName(productId) {
  const product = productsCache.find(p => p.id === productId);
  return product?.name || 'Unknown Product';
}

function updateOrderTotal() {
  const total = currentOrderItems.reduce((sum, item) => sum + round2(item.appliedRate * item.quantity), 0);
  $('#order-total').textContent = formatCurrency(total);
}

function setupOrderForm() {
  $('#order-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitOrder();
  });
}

async function submitOrder() {
  if (!currentCustomer) {
    window.toast?.error('Please select a customer');
    return;
  }
  if (currentOrderItems.length === 0) {
    window.toast?.error('Please add at least one product');
    return;
  }

  window.loading?.show();
  try {
    const subtotal = currentOrderItems.reduce((sum, item) => sum + round2(item.appliedRate * item.quantity), 0);
    const billNumber = await apiRpc('generate_bill_number');

    const orderData = {
      bill_number: billNumber,
      customer_id: currentCustomer.id,
      customer_name_snapshot: currentCustomer.name,
      customer_mobile_snapshot: currentCustomer.mobile,
      customer_address_snapshot: currentCustomer.address,
      subtotal,
      total: subtotal,
      note: $('#order-note')?.value || '',
      created_by: AppState.get('user')?.id
    };

    const [order] = await apiPost('orders', orderData);
    if (!order) throw new Error('Failed to create order');

    const orderItems = currentOrderItems.map(item => {
      const variant = findVariant(item.productVariantId);
      return {
        order_id: order.id,
        product_id: item.productId,
        product_name_snapshot: item.productName || findProductName(item.productId),
        product_variant_id: item.productVariantId,
        pack_name_snapshot: item.packName,
        quantity: item.quantity,
        unit_rate_snapshot: item.appliedRate,
        line_total: round2(item.appliedRate * item.quantity)
      };
    });

    await apiPost('order_items', orderItems);

    window.loading?.hide();
    window.toast?.success('Bill created');
    location.hash = `#orders/${order.id}`;
  } catch (e) {
    window.loading?.hide();
    console.error(e);
    window.toast?.error(e.message || 'Failed to create bill');
  }
}

// ============================================
// ORDER DETAIL
// ============================================
async function loadOrderDetail(orderId) {
  try {
    window.loading?.show();
    const [{ data: order }, { data: items }] = await Promise.all([
      apiGet('orders', { id: `eq.${orderId}`, single: true }),
      apiGet('order_items', { order_id: `eq.${orderId}`, order: 'created_at.asc' })
    ]);
    if (!order) throw new Error('Order not found');

    $('#order-detail-title').textContent = `Bill ${order.bill_number}`;
    renderOrderDetailUI(order, items || []);

    $('#btn-print-bill')?.addEventListener('click', () => printBill(order, items));
    $('#btn-share-bill')?.addEventListener('click', () => shareBill({ ...order, items }));
    $('#btn-whatsapp-bill')?.addEventListener('click', () => openWhatsApp({ ...order, items }));
  } catch (e) {
    console.error(e);
    window.toast?.error('Failed to load order');
  } finally {
    window.loading?.hide();
  }
}

function renderOrderDetailUI(order, items) {
  const container = $('#order-detail-content');
  if (!container) return;
  const s = AppState.get('settings');

  container.innerHTML = `
    <div class="bill-print" style="padding: 20px;">
      <div class="bill-print__header">
        <img src="https://res.cloudinary.com/stw0awze/image/upload/v1792609127/Shahi_Taste_the_Difference_Logo.png" alt="SHAHI Logo" class="bill-print__logo" style="height: 70px; margin-bottom: 10px;">
        <h2 class="bill-print__title">${s.business_name || 'SHAHI'}</h2>
        ${s.business_address ? `<p class="bill-print__info">${s.business_address}</p>` : ''}
        ${s.business_phone ? `<p class="bill-print__info">${s.business_phone}</p>` : ''}
        ${s.business_gstin ? `<p class="bill-print__info">GSTIN: ${s.business_gstin}</p>` : ''}
      </div>
      <div class="bill-print__divider"></div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; font-size: 13px;">
        <div><strong>Bill No:</strong> ${order.bill_number}</div>
        <div style="text-align: right;"><strong>Date:</strong> ${formatDateTime(order.created_at)}</div>
        <div><strong>Customer:</strong> ${order.customer_name_snapshot}</div>
        <div style="text-align: right;">${order.customer_mobile_snapshot || ''}</div>
      </div>
      <div class="bill-print__divider"></div>
      <table class="table" style="font-size: 13px;">
        <thead>
          <tr>
            <th style="width: 40%;">Product</th>
            <th style="width: 15%; text-align: center;">Qty</th>
            <th style="width: 20%; text-align: right;">Rate</th>
            <th style="width: 25%; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td>
                <div style="font-weight: var(--font-medium);">${item.product_name_snapshot}</div>
                <div style="font-size: 11px; color: var(--text-tertiary);">${item.pack_name_snapshot}</div>
              </td>
              <td style="text-align: center;">${item.quantity}</td>
              <td style="text-align: right; font-family: var(--font-ui-mono);">${formatCurrency(item.unit_rate_snapshot)}</td>
              <td style="text-align: right; font-family: var(--font-ui-mono); font-weight: var(--font-semibold);">${formatCurrency(item.line_total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="bill-print__divider"></div>
      <div class="bill-print__total">TOTAL: ${formatCurrency(order.total)}</div>
      ${order.note ? `<div class="bill-print__note" style="margin-top: 20px; font-size: 12px; color: var(--text-tertiary); text-align: center;">Note: ${order.note}</div>` : ''}
      <div class="bill-print__footer" style="margin-top: 20px; font-size: 11px; color: var(--text-tertiary); text-align: center;">${s.bill_footer || 'Thank you for your business!'}</div>
    </div>
  `;
}

function printBill(order, items) {
  const el = $('#order-detail-content');
  if (el) printElement(el);
}

// ============================================
// CACHES
// ============================================
async function loadCustomersCache() {
  try {
    const { data, error } = await apiGet('customers', { order: 'name.asc' });
    if (error) throw error;
    customersCache = data || [];
  } catch (e) { customersCache = []; }
}

async function loadProductsCache() {
  try {
    const [{ data: products }, { data: variants }, { data: images }] = await Promise.all([
      apiGet('products', { active: 'eq.true', order: 'name.asc' }),
      apiGet('product_variants', { active: 'eq.true', order: 'product_id,quantity.asc' }),
      apiGet('product_images', { active: 'eq.true' })
    ]);

    const variantMap = {};
    (variants || []).forEach(v => {
      if (!variantMap[v.product_id]) variantMap[v.product_id] = [];
      variantMap[v.product_id].push(v);
    });

    const imageMap = {};
    (images || []).forEach(img => {
      if (!imageMap[img.product_id]) imageMap[img.product_id] = { main: null, variants: {} };
      if (img.variant_id) imageMap[img.product_id].variants[img.variant_id] = img.image_url;
      else if (!imageMap[img.product_id].main) imageMap[img.product_id].main = img.image_url;
    });

    productsCache = (products || []).map(p => ({
      ...p,
      variants: variantMap[p.id] || [],
      mainImage: imageMap[p.id]?.main || null,
      variantImages: imageMap[p.id]?.variants || {}
    }));
  } catch (e) { productsCache = []; }
}

// Quick create customer
function openCustomerQuickCreate() {
  const sheet = window.sheet.createSheet(`
    <form id="quick-customer-form">
      <div class="form-group">
        <label class="form-label" for="qc-name">Name <span style="color: var(--color-error);">*</span></label>
        <input type="text" id="qc-name" class="form-input" required placeholder="Customer name">
      </div>
      <div class="form-group">
        <label class="form-label" for="qc-mobile">Mobile <span style="color: var(--color-error);">*</span></label>
        <input type="tel" id="qc-mobile" class="form-input" required placeholder="Mobile number">
      </div>
      <div class="form-group">
        <label class="form-label" for="qc-address">Address</label>
        <textarea id="qc-address" class="form-textarea" rows="2" placeholder="Address (optional)"></textarea>
      </div>
    </form>
  `, {
    title: 'Quick Add Customer',
    footer: `
      <button type="button" class="btn btn--outline btn--full" onclick="window.sheet.close()">Cancel</button>
      <button type="button" class="btn btn--primary btn--full" onclick="saveQuickCustomer()">Create & Select</button>
    `
  });
  setTimeout(() => $('#qc-name')?.focus(), 100);
  window._quickCustomerSheet = sheet;
}

window.saveQuickCustomer = async function() {
  const name = $('#qc-name')?.value?.trim();
  const mobile = $('#qc-mobile')?.value?.trim();
  const address = $('#qc-address')?.value?.trim();
  if (!name || !mobile) { window.toast?.error('Name and mobile required'); return; }
  window.loading?.show();
  try {
    const [customer] = await apiPost('customers', { name, mobile, address, active: true });
    if (customer) {
      customersCache.push(customer);
      selectCustomer(customer.id);
      window.sheet?.close();
      window.toast?.success('Customer created');
    }
  } catch (e) {
    console.error(e);
    window.toast?.error('Failed to create customer');
  } finally {
    window.loading?.hide();
  }
};

window.removeOrderItem = removeOrderItem;
window.updateItemQty = updateItemQty;
window.updateItemQtyDirect = updateItemQtyDirect;
window.openCustomerQuickCreate = openCustomerQuickCreate;
window.initViewOrders = initViewOrders;
window.renderViewOrders = renderViewOrders;