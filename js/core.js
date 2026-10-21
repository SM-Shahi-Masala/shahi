/* SHAHI - Core Library
   API client, Auth, State, Routing, Utilities */

// ============================================
// UTILITIES
// ============================================
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const formatCurrency = (amount, currency = '₹') => {
  if (amount == null) return `${currency}0.00`;
  return `${currency}${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (date, options = {}) => {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options
  });
};

const formatDateTime = (date) => {
  const d = date instanceof Date ? date : new Date(date);
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

const throttle = (fn, ms) => {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn(...args);
    }
  };
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const parseNumber = (val, def = 0) => {
  const n = Number(String(val).replace(/[^\d.-]/g, ''));
  return isNaN(n) ? def : n;
};

const round2 = (n) => Math.round(n * 100) / 100;

// ============================================
// SUPABASE CLIENT
// ============================================
class SupabaseClient {
  constructor(url, key) {
    this.url = url.replace(/\/$/, '');
    this.key = key;
    this.headers = {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
    this.session = null;
  }

  async request(method, path, data = null, options = {}) {
    const url = `${this.url}/rest/v1/${path}`;
    const config = {
      method,
      headers: { ...this.headers, ...options.headers },
      ...(data ? { body: JSON.stringify(data) } : {})
    };
    
    if (this.session?.access_token) {
      config.headers['Authorization'] = `Bearer ${this.session.access_token}`;
    }
    
    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || `HTTP ${response.status}`);
      }
      
      if (response.status === 204) return null;
      return response.json();
    } catch (error) {
      console.error(`Supabase ${method} ${path}:`, error);
      throw error;
    }
  }

  // Auth
  async signIn(email, password) {
    const { data, error } = await fetch(`${this.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { ...this.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }).then(r => r.json());
    
    if (error) throw new Error(error.message);
    this.session = data;
    localStorage.setItem('shahi_session', JSON.stringify(data));
    return data;
  }

  async signOut() {
    if (this.session?.refresh_token) {
      await fetch(`${this.url}/auth/v1/logout`, {
        method: 'POST',
        headers: { ...this.headers, 'Authorization': `Bearer ${this.session.access_token}` }
      });
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
        // Verify token still valid
        const { data: { user } } = await this.getUser();
        if (user) return this.session;
      } catch {}
    }
    return null;
  }

  async getUser() {
    if (!this.session?.access_token) return { data: { user: null }, error: null };
    return fetch(`${this.url}/auth/v1/user`, {
      headers: { ...this.headers, 'Authorization': `Bearer ${this.session.access_token}` }
    }).then(r => r.json());
  }

  async refreshSession() {
    if (!this.session?.refresh_token) return null;
    const { data, error } = await fetch(`${this.url}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { ...this.headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: this.session.refresh_token })
    }).then(r => r.json());
    if (error) throw new Error(error.message);
    this.session = data;
    localStorage.setItem('shahi_session', JSON.stringify(data));
    return data;
  }

  // CRUD helpers
  select(table, query = {}) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (Array.isArray(v)) v.forEach(item => params.append(k, item));
      else params.append(k, v);
    });
    return this.request('GET', `${table}?${params}`);
  }

  insert(table, data, returning = true) {
    return this.request('POST', table, data, {
      headers: returning ? { 'Prefer': 'return=representation' } : { 'Prefer': 'return=minimal' }
    });
  }

  update(table, id, data) {
    return this.request('PATCH', `${table}?id=eq.${id}`, data);
  }

  delete(table, id) {
    return this.request('DELETE', `${table}?id=eq.${id}`);
  }

  upsert(table, data, onConflict) {
    return this.request('POST', table, data, {
      headers: { 'Prefer': 'return=representation', 'Resolution': 'merge-duplicates' }
    });
  }

  // RPC calls
  rpc(fn, params = {}) {
    return this.request('POST', `rpc/${fn}`, params);
  }

  // Storage
  getStorageUrl(bucket, path) {
    return `${this.url}/storage/v1/object/public/${bucket}/${path}`;
  }

  async uploadFile(bucket, path, file, options = {}) {
    const formData = new FormData();
    formData.append('', file);
    
    return fetch(`${this.url}/storage/v1/object/${bucket}/${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.session?.access_token || this.key}`,
        ...(options.headers || {})
      },
      body: formData
    }).then(r => r.json());
  }

  async deleteFile(bucket, paths) {
    return fetch(`${this.url}/storage/v1/object/${bucket}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.session?.access_token || this.key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prefixes: paths })
    }).then(r => r.json());
  }
}

// ============================================
// STATE MANAGEMENT
// ============================================
class Store {
  constructor(initialState = {}) {
    this.state = { ...initialState };
    this.listeners = new Set();
  }

  get(path) {
    if (!path) return this.state;
    return path.split('.').reduce((obj, key) => obj?.[key], this.state);
  }

  set(path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    const target = keys.reduce((obj, key) => {
      if (!obj[key]) obj[key] = {};
      return obj[key];
    }, this.state);
    target[last] = value;
    this.notify();
  }

  update(path, updater) {
    const current = this.get(path);
    this.set(path, typeof updater === 'function' ? updater(current) : updater);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach(fn => fn(this.state));
  }
}

// ============================================
// ROUTER
// ============================================
class Router {
  constructor(routes = {}) {
    this.routes = routes;
    this.currentRoute = null;
    this.params = {};
    window.addEventListener('hashchange', () => this.handleHashChange());
    window.addEventListener('load', () => this.handleHashChange());
  }

  handleHashChange() {
    const hash = window.location.hash.slice(1) || '/';
    this.navigate(hash, false);
  }

  navigate(path, pushState = true) {
    // Match route
    let matched = null;
    let params = {};
    
    for (const [pattern, handler] of Object.entries(this.routes)) {
      const regex = this.patternToRegex(pattern);
      const match = path.match(regex);
      if (match) {
        matched = handler;
        params = match.groups || {};
        break;
      }
    }

    if (pushState) {
      window.location.hash = path;
      return;
    }

    this.currentRoute = path;
    this.params = params;
    
    if (matched) {
      matched(params);
    } else {
      this.navigate('/');
    }
  }

  patternToRegex(pattern) {
    const regexPattern = pattern
      .replace(/\//g, '\\/')
      .replace(/:(\w+)/g, '(?<$1>[^/]+)')
      .replace(/\*/g, '.*');
    return new RegExp(`^${regexPattern}$`);
  }

  getParams() { return { ...this.params }; }
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
class ToastManager {
  constructor(container) {
    this.container = container;
  }

  show(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <svg class="toast__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${this.getIcon(type)}
      </svg>
      <span>${this.escapeHtml(message)}</span>
    `;
    
    this.container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    
    setTimeout(() => {
      toast.classList.remove('show');
      toast.addEventListener('transitionend', () => toast.remove());
    }, duration);
  }

  success(msg, d) { this.show(msg, 'success', d); }
  error(msg, d) { this.show(msg, 'error', d); }
  warning(msg, d) { this.show(msg, 'warning', d); }
  info(msg, d) { this.show(msg, 'info', d); }

  getIcon(type) {
    const icons = {
      success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
      error: '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
      warning: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
      info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
    };
    return icons[type] || icons.info;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// ============================================
// LOADING OVERLAY
// ============================================
class LoadingManager {
  constructor(overlay) {
    this.overlay = overlay;
    this.count = 0;
  }

  show() {
    this.count++;
    this.overlay.classList.add('active');
  }

  hide() {
    this.count = Math.max(0, this.count - 1);
    if (this.count === 0) {
      this.overlay.classList.remove('active');
    }
  }
}

// ============================================
// SHEET MANAGER
// ============================================
class SheetManager {
  constructor() {
    this.overlay = null;
    this.currentSheet = null;
  }

  createSheet(content, options = {}) {
    const overlay = document.createElement('div');
    overlay.className = 'sheet-overlay';
    overlay.innerHTML = `
      <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <header class="sheet__header">
          <h2 id="sheet-title" class="sheet__title">${options.title || ''}</h2>
          <button class="sheet__close" aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </header>
        <div class="sheet__content">${content}</div>
        ${options.footer ? `<footer class="sheet__footer">${options.footer}</footer>` : ''}
      </div>
    `;
    
    const sheet = overlay.querySelector('.sheet');
    const closeBtn = overlay.querySelector('.sheet__close');
    
    const close = () => {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 200);
      this.currentSheet = null;
    };
    
    closeBtn.onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
    
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));
    
    this.currentSheet = { overlay, sheet, close };
    return this.currentSheet;
  }

  close() {
    if (this.currentSheet) {
      this.currentSheet.close();
    }
  }
}

// ============================================
// IMAGE HELPERS
// ============================================
const ImageUtils = {
  // Convert file to base64
  toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  // Resize/compress image
  async compress(file, maxWidth = 800, maxHeight = 800, quality = 0.8) {
    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      img.onload = () => {
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  },

  // Validate image file
  validate(file, maxSizeMB = 5) {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return { valid: false, error: 'Please select a valid image (JPG, PNG, WebP)' };
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return { valid: false, error: `Image must be smaller than ${maxSizeMB}MB` };
    }
    return { valid: true };
  }
};

// ============================================
// BILL NUMBER GENERATOR (client-side preview)
// ============================================
const BillNumber = {
  generate(prefix = 'SH') {
    const year = new Date().getFullYear();
    // Note: Actual number comes from server
    return `${prefix}-${year}-XXXXXX`;
  }
};

// ============================================
// EXPORTS
// ============================================
window.SHAHI = {
  $, $$,
  formatCurrency, formatDate, formatDateTime,
  generateId, debounce, throttle, clamp, sleep, parseNumber, round2,
  SupabaseClient, Store, Router, ToastManager, LoadingManager, SheetManager,
  ImageUtils, BillNumber
};