/* SHAHI — Admin View (Native App Style) */

function renderViewAdmin(params = {}) {
  const tab = params.tab || 'business';
  return `
    <section class="view-content" style="padding: var(--space-4);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3);">
        <h2 style="font-size: var(--text-xl); font-weight: var(--font-bold); margin: 0;">Settings</h2>
      </div>

      <div class="tabs" id="admin-tabs" role="tablist">
        <button class="tab ${tab === 'business' ? 'active' : ''}" role="tab" data-tab="business" aria-selected="${tab === 'business'}">Business Details</button>
        <button class="tab ${tab === 'settings' ? 'active' : ''}" role="tab" data-tab="settings" aria-selected="${tab === 'settings'}">Bill Settings</button>
        <button class="tab ${tab === 'users' ? 'active' : ''}" role="tab" data-tab="users" aria-selected="${tab === 'users'}" data-role-owner>Users</button>
      </div>

      <div id="tab-business" class="tab-panel" style="${tab !== 'business' ? 'display: none;' : ''}" role="tabpanel">
        ${renderBusinessTab()}
      </div>

      <div id="tab-settings" class="tab-panel" style="${tab !== 'settings' ? 'display: none;' : ''}" role="tabpanel">
        ${renderBillSettingsTab()}
      </div>

      <div id="tab-users" class="tab-panel" style="${tab !== 'users' ? 'display: none;' : ''}" role="tabpanel" data-role-owner>
        ${renderUsersTab()}
      </div>
    </section>
  `;
}

function renderBusinessTab() {
  const s = AppState.get('settings') || {};
  return `
    <form id="business-form">
      <div class="card" style="margin-bottom: var(--space-4);">
        <div class="card__header"><h3 class="card__title">Business Information</h3></div>
        <div class="card__body" style="padding: var(--space-4);">
          <div class="form-group">
            <label class="form-label" for="business-name">Business Name <span style="color: var(--color-error);">*</span></label>
            <input type="text" id="business-name" class="form-input" required value="${s.business_name || 'SHAHI'}">
          </div>
          <div class="form-group">
            <label class="form-label" for="business-address">Address</label>
            <textarea id="business-address" class="form-textarea" rows="2" placeholder="Full address for bills">${s.business_address || ''}</textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="business-phone">Phone</label>
              <input type="tel" id="business-phone" class="form-input" placeholder="+91 98765 43210" value="${s.business_phone || ''}">
            </div>
            <div class="form-group">
              <label class="form-label" for="business-gstin">GSTIN</label>
              <input type="text" id="business-gstin" class="form-input" placeholder="GSTIN (optional)" value="${s.business_gstin || ''}">
            </div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom: var(--space-4);">
        <div class="card__header"><h3 class="card__title">WhatsApp Integration</h3></div>
        <div class="card__body" style="padding: var(--space-4);">
          <div class="form-group">
            <label class="form-label" for="business-whatsapp">Business WhatsApp Number</label>
            <div class="input-group">
              <span class="input-group__addon">+</span>
              <input type="tel" id="business-whatsapp" class="input-group__input" placeholder="919876543210" value="${(s.whatsapp_number || '').replace(/\D/g, '')}">
            </div>
            <p class="form-help">Country code + number, no spaces or + sign.</p>
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom: var(--space-4);">
        <div class="card__header"><h3 class="card__title">Logo</h3></div>
        <div class="card__body" style="padding: var(--space-4); text-align: center;">
          <img src="https://res.cloudinary.com/stw0awze/image/upload/v1792609127/Shahi_Taste_the_Difference_Logo.png" alt="SHAHI Logo" style="max-height: 80px; max-width: 100%; border-radius: var(--radius-md); background: var(--bg-tertiary); padding: 8px;">
          <p class="form-help" style="margin-top: var(--space-2);">Logo configured via Cloudinary URL in app config.</p>
        </div>
      </div>

      <button type="submit" class="btn btn--primary btn--full" data-role-owner>Save Business Details</button>
    </form>
  `;
}

function renderBillSettingsTab() {
  const s = AppState.get('settings') || {};
  const prefix = s.bill_prefix || 'SH';
  const year = new Date().getFullYear();
  return `
    <form id="bill-settings-form">
      <div class="card" style="margin-bottom: var(--space-4);">
        <div class="card__header"><h3 class="card__title">Bill Appearance</h3></div>
        <div class="card__body" style="padding: var(--space-4);">
          <div class="form-group">
            <label class="form-label" for="bill-prefix">Bill Number Prefix</label>
            <div class="input-group">
              <input type="text" id="bill-prefix" class="input-group__input" maxlength="4" style="text-transform: uppercase;" value="${prefix}">
              <span class="input-group__addon" id="bill-prefix-preview">-${year}-000001</span>
            </div>
            <p class="form-help">Format: PREFIX-YEAR-SEQUENCE (e.g., SH-2026-001042)</p>
          </div>
          <div class="form-group">
            <label class="form-label" for="bill-footer">Footer Text</label>
            <textarea id="bill-footer" class="form-textarea" rows="2" placeholder="Thank you for your business!">${s.bill_footer || ''}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label" for="bill-note">Default Note</label>
            <textarea id="bill-note" class="form-textarea" rows="2" placeholder="Optional default note on all bills">${s.bill_note || ''}</textarea>
          </div>
        </div>
      </div>

      <button type="submit" class="btn btn--primary btn--full" data-role-owner>Save Bill Settings</button>
    </form>
  `;
}

function renderUsersTab() {
  return `
    <div class="card" style="margin-bottom: var(--space-4);">
      <div class="card__header">
        <h3 class="card__title">Team Members</h3>
        <button class="btn btn--ghost btn--sm" id="btn-add-user">
          <svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Invite User
        </button>
      </div>
      <div class="card__body" style="padding: 0;">
        <div id="users-list" class="list">
          <div class="empty-state" style="padding: 32px 16px;">
            <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/></svg>
            <div class="empty-state__title">No team members yet</div>
            <p class="empty-state__text">Invite users to collaborate</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function initViewAdmin(params = {}) {
  const tab = params.tab || 'business';

  const container = $('#view-container');
  const existing = container.querySelector('.view.active');
  if (existing) existing.remove();

  const viewEl = document.createElement('div');
  viewEl.className = 'view active';
  viewEl.id = 'view-admin';
  viewEl.innerHTML = renderViewAdmin(params);
  container.appendChild(viewEl);

  // Tab switching
  $$('.tab', viewEl).forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.dataset.tab;
      window.location.hash = `#admin/${t}`;
    });
  });

  // Role visibility
  const isOwner = AppState.get('role') === 'owner';
  $$('[data-role-owner]', viewEl).forEach(el => el.style.display = isOwner ? '' : 'none');

  // Init active tab
  if (tab === 'business') initBusinessTab(viewEl);
  else if (tab === 'settings') initBillSettingsTab(viewEl);
  else if (tab === 'users') initUsersTab(viewEl);
}

// ============================================
// BUSINESS TAB
// ============================================
function initBusinessTab(viewEl) {
  const form = $('#business-form', viewEl);
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveBusinessSettings();
    });
  }
}

async function saveBusinessSettings() {
  const settings = {
    business_name: $('#business-name').value.trim() || 'SHAHI',
    business_address: $('#business-address').value.trim(),
    business_phone: $('#business-phone').value.trim(),
    business_gstin: $('#business-gstin').value.trim(),
    whatsapp_number: $('#business-whatsapp').value.trim().replace(/\D/g, '')
  };

  window.loading?.show();
  try {
    for (const [key, value] of Object.entries(settings)) {
      await saveSetting(key, value);
    }
    window.toast?.success('Saved');
  } catch (e) {
    window.toast?.error('Failed to save');
  } finally {
    window.loading?.hide();
  }
}

// ============================================
// BILL SETTINGS TAB
// ============================================
function initBillSettingsTab(viewEl) {
  const prefixInput = $('#bill-prefix', viewEl);
  const preview = $('#bill-prefix-preview', viewEl);
  const year = new Date().getFullYear();

  prefixInput?.addEventListener('input', () => {
    prefixInput.value = prefixInput.value.toUpperCase().slice(0, 4);
    preview.textContent = `-${year}-000001`;
  });

  const form = $('#bill-settings-form', viewEl);
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveBillSettings();
    });
  }
}

async function saveBillSettings() {
  const settings = {
    bill_prefix: $('#bill-prefix').value.trim().toUpperCase() || 'SH',
    bill_footer: $('#bill-footer').value.trim(),
    bill_note: $('#bill-note').value.trim()
  };

  window.loading?.show();
  try {
    for (const [key, value] of Object.entries(settings)) {
      await saveSetting(key, value);
    }
    window.toast?.success('Saved');
  } catch (e) {
    window.toast?.error('Failed to save');
  } finally {
    window.loading?.hide();
  }
}

// ============================================
// USERS TAB
// ============================================
function initUsersTab(viewEl) {
  $('#btn-add-user')?.addEventListener('click', () => openInviteUserSheet());
}

function openInviteUserSheet() {
  const sheet = window.sheet.createSheet(`
    <form id="invite-user-form">
      <div class="form-group">
        <label class="form-label" for="invite-email">Email <span style="color: var(--color-error);">*</span></label>
        <input type="email" id="invite-email" class="form-input" required placeholder="user@example.com">
      </div>
      <div class="form-group">
        <label class="form-label" for="invite-name">Full Name</label>
        <input type="text" id="invite-name" class="form-input" placeholder="Optional">
      </div>
      <div class="form-group">
        <label class="form-label" for="invite-role">Role <span style="color: var(--color-error);">*</span></label>
        <select id="invite-role" class="form-select" required>
          <option value="staff">Staff (Order creation only)</option>
          <option value="manager">Manager (Products, Customers, Rates)</option>
        </select>
      </div>
      <p class="form-help">User signs up with same email. Role set in Supabase users table.</p>
    </form>
  `, {
    title: 'Invite Team Member',
    footer: `
      <button type="button" class="btn btn--outline btn--full" onclick="window.sheet.close()">Cancel</button>
      <button type="button" class="btn btn--primary btn--full" onclick="sendInvite()">Send Invite</button>
    `
  });
}

window.sendInvite = async function() {
  const email = $('#invite-email')?.value?.trim();
  const name = $('#invite-name')?.value?.trim();
  const role = $('#invite-role')?.value;
  if (!email || !role) { window.toast?.error('Email and role required'); return; }
  window.loading?.show();
  try {
    // Supabase invite (optional) — user creates account, owner sets role in users table
    await apiPost('users', { email, full_name: name || '', role, active: true });
    window.sheet?.close();
    window.toast?.success('User added');
  } catch (e) {
    console.error(e);
    window.toast?.error(e.message || 'Failed to add user');
  } finally {
    window.loading?.hide();
  }
};

// ============================================
// HELPERS
// ============================================
async function saveSetting(key, value) {
  try {
    await window.supabase.upsert('settings', { key, value }, 'key');
    AppState.update('settings', s => ({ ...s, [key]: value }));
    return true;
  } catch (e) { return false; }
}

window.initViewAdmin = initViewAdmin;
window.renderViewAdmin = renderViewAdmin;