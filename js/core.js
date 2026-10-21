/* SHAHI — Core Library (Clean, Bug-Free) */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const formatCurrency = (amount, currency = '₹') => {
  if (amount == null) return `${currency}0.00`;
  return `${currency}${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (date) => {
  if (!date) return '—';
  const d = new Date(date);
  return `${formatDate(d)}, ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
};

const generateId = () => crypto.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
  const r = Math.random() * 16 | 0;
  return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
});

const debounce = (fn, ms) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const parseNumber = (val, def = 0) => {
  const n = Number(String(val).replace(/[^\d.-]/g, ''));
  return isNaN(n) ? def : n;
};
const round2 = (n) => Math.round(n * 100) / 100;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ============================================
// SUPABASE CLIENT
// ============================================
class SupabaseClient {
  constructor(url, key) {
    this.baseUrl = url.replace(/\/$/, '');
    this.key = key;
    this.session = null;
  }

  getAuthHeaders() {
    const headers = {
      apikey: this.key,
      Authorization: `Bearer ${this.key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    };
    if (this.session?.access_token) {
      headers.Authorization = `Bearer ${this.session.access_token}`;
    }
    return headers;
  }

  async request(method, path, body = null, extraHeaders = {}) {
    const url = `${this.baseUrl}/rest/v1/${path}`;
    const config = {
      method,
      headers: { ...this.getAuthHeaders(), ...extraHeaders },
    };
    if (body) config.body = JSON.stringify(body);

    try {
      const res = await fetch(url, config);
      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try { const e = await res.json(); errMsg = e.message || e.error || errMsg; } catch {}
        throw new Error(errMsg);
      }
      if (res.status === 204) return null;
      return res.json();
    } catch (err) {
      if (err.message.startsWith('HTTP')) throw err;
      throw new Error(`Network error: ${err.message}`);
    }
  }

  // ---- Table CRUD ----
  select(table, query = {}) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      if (Array.isArray(v)) { v.forEach(item => params.append(k, item)); }
      else { params.append(k, v); }
    }
    return this.request('GET', `${table}?${params.toString()}`);
  }

  insert(table, data) {
    return this.request('POST', table, data);
  }

  update(table, id, data) {
    return this.request('PATCH', `${table}?id=eq.${id}`, data);
  }

  delete(table, id) {
    return this.request('DELETE', `${table}?id=eq.${id}`);
  }

  upsert(table, data) {
    return this.request('POST', table, data, { Prefer: 'resolution=merge-duplicates,return=representation' });
  }

  // ---- RPC ----
  rpc(fn, params = {}) {
    return this.request('POST', `rpc/${fn}`, params);
  }

  // ---- Auth ----
  async signUp(email, password, data = {}) {
    const res = await fetch(`${this.baseUrl}/auth/v1/signup`, {
      method: 'POST',
      headers: { ...this.getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, data })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Signup failed');
    return json;
  }

  async signIn(email, password) {
    const res = await fetch(`${this.baseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { ...this.getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Login failed');
    this.session = json;
    localStorage.setItem('shahi_session', JSON.stringify(json));
    return json;
  }

  async signOut() {
    if (this.session?.access_token) {
      await fetch(`${this.baseUrl}/auth/v1/logout`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      }).catch(() => {});
    }
    this.session = null;
    localStorage.removeItem('shahi_session');
  }

  async getSession() {
    if (this.session) return this.session;
    const stored = localStorage.getItem('shahi_session');
    if (stored) {
      try {
        this.session = JSON.parse(stored);
        // Validate with Supabase
        const { data: { user } } = await this.getUser();
        if (user) return this.session;
      } catch { this.session = null; localStorage.removeItem('shahi_session'); }
    }
    return null;
  }

  async getUser() {
    if (!this.session?.access_token) return { data: { user: null }, error: null };
    const res = await fetch(`${this.baseUrl}/auth/v1/user`, {
      headers: this.getAuthHeaders()
    });
    return res.json();
  }

  async refreshSession() {
    if (!this.session?.refresh_token) return null;
    const res = await fetch(`${this.baseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { ...this.getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: this.session.refresh_token })
    });
    const json = await res.json();
    if (!res.ok) return null;
    this.session = json;
    localStorage.setItem('shahi_session', JSON.stringify(json));
    return json;
  }

  // ---- Storage ----
  getStorageUrl(bucket, path) {
    return `${this.baseUrl}/storage/v1/object/public/${bucket}/${path}`;
  }

  async uploadFile(bucket, path, file) {
    const res = await fetch(`${this.baseUrl}/storage/v1/object/${bucket}/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.session?.access_token || this.key}` },
      body: file
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || 'Upload failed');
    return json;
  }
}

// ============================================
// STATE STORE
// ============================================
class Store {
  constructor(initial = {}) {
    this.state = { ...initial };
    this.listeners = new Set();
  }
  get(path) {
    if (!path) return this.state;
    return path.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : undefined, this.state);
  }
  set(path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    const target = keys.reduce((o, k) => { if (!o[k]) o[k] = {}; return o[k]; }, this.state);
    target[last] = value;
    this.listeners.forEach(fn => fn(this.state));
  }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
}

// ============================================
// TOAST
// ============================================
class ToastManager {
  constructor(container) { this.container = container; }
  show(msg, type = 'info', duration = 3000) {
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    const icons = {
      success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
      error: '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
      warning: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
      info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
    };
    el.innerHTML = `<svg class="toast__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icons[type] || icons.info}</svg><span>${this.esc(msg)}</span>`;
    this.container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      el.addEventListener('transitionend', () => el.remove());
    }, duration);
  }
  esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
  success(m, d) { this.show(m, 'success', d); }
  error(m, d) { this.show(m, 'error', d); }
  warning(m, d) { this.show(m, 'warning', d); }
}

// ============================================
// LOADING
// ============================================
class LoadingManager {
  constructor(overlay) { this.overlay = overlay; this.count = 0; }
  show() { this.count++; this.overlay.classList.add('active'); }
  hide() { this.count = Math.max(0, this.count - 1); if (this.count === 0) this.overlay.classList.remove('active'); }
}

// ============================================
// BOTTOM SHEET
// ============================================
class SheetManager {
  constructor() { this.current = null; }
  createSheet(contentHtml, options = {}) {
    const overlay = document.createElement('div');
    overlay.className = 'sheet-overlay';
    overlay.innerHTML = `
      <div class="sheet" role="dialog" aria-modal="true">
        <div class="sheet__handle"></div>
        <header class="sheet__header">
          <h2 class="sheet__title">${options.title || ''}</h2>
          <button class="sheet__close" aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </header>
        <div class="sheet__content">${contentHtml}</div>
        ${options.footer ? `<footer class="sheet__footer">${options.footer}</footer>` : ''}
      </div>
    `;
    const sheet = overlay.querySelector('.sheet');
    const closeBtn = overlay.querySelector('.sheet__close');
    const close = () => {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 200);
      this.current = null;
    };
    closeBtn.onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));
    this.current = { overlay, sheet, close };
    return this.current;
  }
  close() { if (this.current) this.current.close(); }
}

// ============================================
// IMAGE UTILS
// ============================================
const ImageUtils = {
  validate(file, maxMB = 5) {
    const ok = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ok.includes(file.type)) return { valid: false, error: 'Use JPG, PNG, or WebP' };
    if (file.size > maxMB * 1024 * 1024) return { valid: false, error: `Max ${maxMB}MB` };
    return { valid: true };
  },
  compress(file, maxW = 800, maxH = 800, q = 0.85) {
    return new Promise(resolve => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      img.onload = () => {
        let { width, height } = img;
        if (width > maxW || height > maxH) {
          const r = Math.min(maxW / width, maxH / height);
          width *= r; height *= r;
        }
        canvas.width = width; canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(resolve, 'image/jpeg', q);
      };
      img.src = URL.createObjectURL(file);
    });
  }
};

// ============================================
// EXPORTS
// ============================================
window.SHAHI = {
  $, $$, formatCurrency, formatDate, formatDateTime,
  generateId, debounce, clamp, parseNumber, round2, sleep,
  SupabaseClient, Store, ToastManager, LoadingManager, SheetManager, ImageUtils
};