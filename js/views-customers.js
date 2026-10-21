/* SHAHI — Customers View (Native App Style) */

function renderViewCustomers(params = {}) {
  if (params.newCustomer || params.customerId) return renderCustomerForm();
  return renderCustomersList();
}

function renderCustomersList() {
  return `
    <section class="view-content" style="padding: var(--space-4);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
        <h2 style="font-size: var(--text-xl); font-weight: var(--font-bold); margin: 0;">Customers</h2>
        <button class="btn btn--primary" onclick="location.hash='#customers/new'" data-role-manager>
          <svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Customer
        </button>
      </div>

      <div class="card" style="margin-bottom: var(--space-4);">
        <div class="card__body" style="padding: var(--space-4);">
          <div class="search-box">
            <input type="search" id="customers-search" class="form-input" placeholder="Search customers..." aria-label="Search customers">
          </div>
        </div>
      </div>

      <div id="customers-list" class="list">
        <!-- Populated by JS -->
      </div>
    </section>
  `;
}

function renderCustomerForm() {
  return `
    <section class="view-content" style="padding: var(--space-4);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
        <h2 style="font-size: var(--text-xl); font-weight: var(--font-bold); margin: 0;">Customer Details</h2>
      </div>

      <form id="customer-form">
        <div class="card" style="margin-bottom: var(--space-4);">
          <div class="card__body" style="padding: var(--space-4);">
            <div class="form-group">
              <label class="form-label" for="customer-name">Name <span style="color: var(--color-error);">*</span></label>
              <input type="text" id="customer-name" class="form-input" required placeholder="Customer name">
            </div>
            <div class="form-group">
              <label class="form-label" for="customer-mobile">Mobile <span style="color: var(--color-error);">*</span></label>
              <input type="tel" id="customer-mobile" class="form-input" required placeholder="Mobile number">
            </div>
            <div class="form-group">
              <label class="form-label" for="customer-address">Address</label>
              <textarea id="customer-address" class="form-textarea" rows="2" placeholder="Full address"></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="customer-email">Email</label>
                <input type="email" id="customer-email" class="form-input" placeholder="email@example.com">
              </div>
              <div class="form-group">
                <label class="form-label" for="customer-gstin">GSTIN</label>
                <input type="text" id="customer-gstin" class="form-input" placeholder="GSTIN (optional)">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="customer-credit-limit">Credit Limit</label>
                <div class="input-group">
                  <span class="input-group__addon">₹</span>
                  <input type="number" id="customer-credit-limit" class="input-group__input" min="0" step="100" value="0">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label" for="customer-payment-terms">Payment Terms (days)</label>
                <input type="number" id="customer-payment-terms" class="form-input" min="0" value="0">
              </div>
            </div>
            <div class="form-group">
              <label class="form-checkbox">
                <input type="checkbox" id="customer-active" checked>
                <span>Active</span>
              </label>
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom: var(--space-4);" data-role-manager>
          <div class="card__header">
            <h3 class="card__title">Custom Rates</h3>
            <button type="button" class="btn btn--ghost btn--sm" id="btn-edit-rates">Edit Rates</button>
          </div>
          <div class="card__body" style="padding: var(--space-4);" id="customer-rates-display">
            <p style="color: var(--text-tertiary); font-size: var(--text-sm);">No custom rates set.</p>
          </div>
        </div>

        <div style="display: flex; gap: var(--space-3);">
          <button type="button" class="btn btn--outline btn--full" onclick="location.hash='#customers'">Cancel</button>
          <button type="submit" class="btn btn--primary btn--full" data-role-manager>Save Customer</button>
        </div>
      </form>
    </section>
  `;
}

async function initViewCustomers(params = {}) {
  await loadCustomersCache();

  const container = $('#view-container');
  const existing = container.querySelector('.view.active');
  if (existing) existing.remove();

  const viewEl = document.createElement('div');
  viewEl.className = 'view active';
  viewEl.id = 'view-customers';
  viewEl.innerHTML = renderViewCustomers(params);
  container.appendChild(viewEl);

  const form = $('#customer-form');
  if (form) {
    form.dataset.customerId = params.customerId || '';
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveCustomer(form);
    });
  }

  $('#btn-edit-rates')?.addEventListener('click', () => openRatesEditor(form?.dataset.customerId));

  if (params.newCustomer) {
    $('#customer-rates-display').style.display = 'none';
  } else if (params.customerId) {
    await loadCustomerDetail(params.customerId, form);
  }
}

// ============================================
// LIST
// ============================================
async function loadCustomersCache() {
  try {
    const { data, error } = await apiGet('customers', { order: 'name.asc' });
    if (error) throw error;
    window.customersCache = data || [];
    renderCustomersListUI();
  } catch (e) {
    window.customersCache = [];
    window.toast?.error('Failed to load customers');
  }
}

function renderCustomersListUI() {
  const container = $('#customers-list');
  if (!container) return;

  const list = window.customersCache || [];
  if (!list.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 48px 16px;">
        <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        <div class="empty-state__title">No customers yet</div>
        <p class="empty-state__text">Add your first customer to start billing</p>
        <button class="btn btn--primary" onclick="location.hash='#customers/new'" data-role-manager>Add Customer</button>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(c => `
    <a href="#customers/${c.id}" class="list-item" style="text-decoration: none; color: inherit;">
      <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--brand-red-light); display: flex; align-items: center; justify-content: center; color: var(--brand-red-dark); font-weight: var(--font-bold); font-size: 18px; flex-shrink: 0;">
        ${c.name.charAt(0).toUpperCase()}
      </div>
      <div class="list-item__content">
        <div class="list-item__title">${c.name}</div>
        <div class="list-item__subtitle">${c.mobile}${c.address ? ` • ${c.address}` : ''}</div>
      </div>
      <div class="list-item__meta">
        <span class="badge ${c.active ? 'badge--success' : 'badge--archive'}">${c.active ? 'Active' : 'Archived'}</span>
      </div>
    </a>
  `).join('');

  const searchInput = $('#customers-search');
  if (searchInput) {
    searchInput.addEventListener('input', SHAHI.debounce(() => {
      const term = searchInput.value.toLowerCase();
      $$('#customers-list .list-item').forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(term) ? 'flex' : 'none';
      });
    }, 200));
  }
}

// ============================================
// DETAIL + FORM
// ============================================
async function loadCustomerDetail(customerId, form) {
  try {
    const { data, error } = await apiGet('customers', { id: `eq.${customerId}`, single: true });
    if (error) throw error;
    if (!data) throw new Error('Customer not found');

    populateCustomerForm(form, data);
    await loadCustomerRatesDisplay(customerId);

    $('#btn-edit-rates')?.addEventListener('click', () => openRatesEditor(customerId));
  } catch (e) {
    console.error(e);
    window.toast?.error('Failed to load customer');
  }
}

function populateCustomerForm(form, c) {
  if (!form) return;
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

async function saveCustomer(form) {
  const customerId = form.dataset.customerId;
  const isNew = !customerId;

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

  if (!data.name || !data.mobile) {
    window.toast?.error('Name and mobile are required');
    return;
  }

  window.loading?.show();
  try {
    let result;
    if (isNew) {
      [result] = await apiPost('customers', data);
      window.customersCache.push(result);
      window.toast?.success('Customer created');
      location.hash = `#customers/${result.id}`;
    } else {
      await apiPatch('customers', customerId, data);
      const idx = window.customersCache.findIndex(c => c.id === customerId);
      if (idx >= 0) window.customersCache[idx] = { ...window.customersCache[idx], ...data };
      window.toast?.success('Customer updated');
      renderCustomersListUI();
      location.hash = `#customers/${customerId}`;
    }
  } catch (e) {
    console.error(e);
    window.toast?.error(e.message || 'Failed to save customer');
  } finally {
    window.loading?.hide();
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
    $('#customer-rates-display').innerHTML = '<p style="color: var(--text-tertiary); font-size: var(--text-sm);">Could not load rates.</p>';
  }
}

function renderCustomerRatesDisplay(rates) {
  const container = $('#customer-rates-display');
  if (!container) return;

  if (!rates.length) {
    container.innerHTML = '<p style="color: var(--text-tertiary); font-size: var(--text-sm);">No custom rates set.</p>';
    return;
  }

  container.innerHTML = rates.map(r => {
    const v = r.product_variants;
    const p = v?.products;
    return `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--separator);">
        <div>
          <div style="font-weight: var(--font-medium);">${p?.name} - ${v?.pack_name}</div>
          <div style="font-size: var(--text-xs); color: var(--text-tertiary);">Custom Rate</div>
        </div>
        <span style="font-weight: var(--font-semibold); font-family: var(--font-ui-mono);">${formatCurrency(r.rate)}</span>
      </div>
    `;
  }).join('');
}

// ============================================
// RATES EDITOR
// ============================================
function openRatesEditor(customerId) {
  if (!customerId) return;

  const variants = productsCacheGlobal()
    .filter(p => p.active)
    .flatMap(p => (p.variants || []).filter(v => v.active).map(v => ({ ...v, productName: p.name, productId: p.id })));

  const sheet = window.sheet.createSheet(`
    <div style="margin-bottom: var(--space-4);">
      <div class="search-box">
        <input type="search" id="rates-search" class="form-input" placeholder="Search products...">
      </div>
    </div>
    <div id="rates-editor-list" style="max-height: 50vh; overflow-y: auto;">
      ${variants.map(v => {
        return `
          <div class="card" style="margin-bottom: var(--space-3); border: none; background: var(--bg-secondary);" data-variant-id="${v.id}">
            <div class="card__body" style="padding: var(--space-3);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-weight: var(--font-medium);">${v.productName}</div>
                  <div style="font-size: var(--text-sm); color: var(--text-tertiary);">${v.pack_name}</div>
                </div>
                <div style="display: flex; align-items: center; gap: var(--space-3);">
                  <label class="form-checkbox" style="margin: 0;">
                    <input type="checkbox" class="rate-enabled" data-variant-id="${v.id}">
                    <span>Custom</span>
                  </label>
                  <div class="input-group" style="width: 120px; display: none;" class="rate-input-group">
                    <span class="input-group__addon">₹</span>
                    <input type="number" class="input-group__input rate-value" step="0.01" min="0" placeholder="Rate" data-variant-id="${v.id}">
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `, {
    title: 'Edit Custom Rates',
    footer: `
      <button type="button" class="btn btn--outline btn--full" onclick="window.sheet.close()">Cancel</button>
      <button type="button" class="btn btn--primary btn--full" onclick="saveCustomerRates('${customerId}')">Save Rates</button>
    `
  });

  $$('.rate-enabled', sheet.sheet).forEach(cb => {
    cb.addEventListener('change', () => {
      const group = cb.closest('.card').querySelector('.rate-input-group');
      if (group) group.style.display = cb.checked ? 'flex' : 'none';
    });
  });

  const searchInput = $('#rates-search');
  if (searchInput) {
    searchInput.addEventListener('input', SHAHI.debounce(() => {
      const term = searchInput.value.toLowerCase();
      $$('[data-variant-id]', sheet.sheet).forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(term) ? 'block' : 'none';
      });
    }, 150));
  }

  window._ratesCustomerId = customerId;
}

window.saveCustomerRates = async function(customerId) {
  const rates = [];
  $$('.rate-enabled:checked').forEach(cb => {
    const variantId = cb.dataset.variantId;
    const input = cb.closest('.card').querySelector('.rate-value');
    const rate = parseNumber(input?.value);
    if (rate > 0) rates.push({ customer_id: customerId, product_variant_id: variantId, rate, active: true });
  });

  window.loading?.show();
  try {
    const { data: existing } = await apiGet('customer_rates', { customer_id: `eq.${customerId}` });
    if (existing) {
      for (const r of existing) await apiPatch('customer_rates', r.id, { active: false });
    }
    if (rates.length) await apiPost('customer_rates', rates);
    window.sheet?.close();
    window.toast?.success('Rates saved');
  } catch (e) {
    console.error(e);
    window.toast?.error('Failed to save rates');
  } finally {
    window.loading?.hide();
  }
};

function productsCacheGlobal() {
  return window.productsCache || [];
}

window.initViewCustomers = initViewCustomers;
window.renderViewCustomers = renderViewCustomers;