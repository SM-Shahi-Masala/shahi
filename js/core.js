'use strict';
// Shared helpers, page shell, login. Views register themselves in VIEWS.

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const rs = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const rs2 = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (n) => Number(n || 0).toLocaleString('en-IN');

const S = { user: null, boot: null, bootAt: 0, business: 'SHAHI' };
const VIEWS = {};
const GLOBAL_ACT = {};
let ACT = {}; // actions of the page that is open now

// Line icons, drawn in the colour of the text around them.
const ICONS = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
  phone:
    '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  orders: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M8.5 10h7M8.5 14h7M8.5 18h4"/>',
  store: '<path d="M4 10v10h16V10"/><path d="M3 10l1.5-6h15L21 10"/><path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M10 20v-5h4v5"/>',
  box: '<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  chart: '<path d="M4 4v16h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M18 14.3c2 .8 3.5 2.6 3.5 5.7"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
  settings: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  power: '<path d="M12 3v9"/><path d="M6.3 6.3a8 8 0 1 0 11.4 0"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  send: '<path d="M21 3L10 14"/><path d="M21 3l-7 18-4-7-7-4z"/>',
  print: '<path d="M7 8V3h10v5"/><rect x="3" y="8" width="18" height="9" rx="2"/><path d="M7 14h10v7H7z"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
  wa: '<path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.4z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2.2-1-1 .9c-1-.5-2.1-1.5-2.6-2.6l.9-1-1-2.2z"/>',
};
const icon = (name, size = 22) =>
  `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
// A tap-to-call link; cls 'btn' gives the big button, '' a small link inside text.
const tel = (mobile, cls = 'btn') => (!mobile ? '' : `<a class="${cls}" href="tel:${esc(mobile)}">${icon('phone', cls ? 18 : 14)} ${esc(mobile)}</a>`);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (d) => {
  if (!d) return '';
  const [y, m, day] = d.slice(0, 10).split('-');
  return `${+day} ${MONTHS[m - 1]}` + (S.boot && y !== S.boot.today.slice(0, 4) ? ' ' + y : '');
};
const fullDate = (d) => (d ? `${+d.slice(8, 10)} ${MONTHS[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}` : '');
const fmtAt = (iso) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const addDaysStr = (d, n) => {
  const t = new Date(d + 'T00:00:00Z');
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};
const dayLabel = (d) => (d === S.boot.today ? 'Today' : d === addDaysStr(S.boot.today, -1) ? 'Yesterday' : fmtDate(d));
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const dots = (...parts) => parts.filter(Boolean).join(' · ');

// What this person may do. The owner may do everything.
const isOwner = () => S.user.role === 'owner';
const can = (perm) => isOwner() || S.user.perms.includes(perm);
const ROLE_NAME = { owner: 'Owner', manager: 'Manager', staff: 'Staff' };

// A product picture (it lives on Cloudinary), or a plain box with an icon when there is none (or it cannot be loaded).
const noPic = (cls = '') => `<span class="pic none ${cls}">${icon('image', 26)}</span>`;
// A Cloudinary picture is asked for small and in the best format for the phone (f_auto, q_auto), 300 px wide.
const cloudSmall = (url) => url.replace('/image/upload/', '/image/upload/f_auto,q_auto,c_limit,w_300/');
// x: a product or pack, with the image_url of its picture.
const pic = (x, cls = '') => (x && x.image_url ? `<img class="pic ${cls}" src="${esc(cloudSmall(x.image_url))}" alt="" loading="lazy">` : noPic(cls));
// A picture that cannot be loaded becomes the plain box (the page may not use inline onerror).
document.addEventListener(
  'error',
  (e) => {
    const el = e.target;
    if (el.tagName === 'IMG' && el.classList.contains('pic')) el.outerHTML = noPic(el.classList.contains('big') ? 'big' : '');
  },
  true
);

// The login code of this phone. It is sent with every request; logging out throws it away.
const session = {
  get: () => {
    try {
      return localStorage.getItem('sid') || '';
    } catch {
      return '';
    }
  },
  set: (v) => {
    try {
      if (v) localStorage.setItem('sid', v);
      else localStorage.removeItem('sid');
    } catch {}
  },
};

async function api(method, url, body) {
  let res;
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (session.get()) headers['X-Session'] = session.get();
    res = await fetch(API_URL + url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error('No internet. Check your connection and try again.');
  }
  const data = await res.json().catch(() => null);
  if (res.status === 401 && url !== '/login') {
    session.set('');
    store.clear();
    if (S.user) {
      S.user = null;
      render();
    }
  }
  if (!res.ok) throw new Error((data && data.error) || 'Something went wrong. Try again.');
  // Anything saved can change what other screens show: they all check again on their next opening.
  if (method !== 'GET') store.stale();
  return data;
}

// ---------- the phone's own copy of what it saw last ----------
// A screen opens at once from this copy; the server is asked again in the background and the screen is drawn again
// when something changed. Making a bill always goes to the server (it works out rates, totals and the bill number).
// Cleared on logout, so the next person on this phone sees nothing of the last one.
const FRESH_MS = 20000; // an answer younger than this is not asked again
const store = {
  key: (url) => 'c:' + url,
  read(url) {
    try {
      return JSON.parse(localStorage.getItem(store.key(url)) || 'null');
    } catch {
      return null;
    }
  },
  write(url, data) {
    const text = JSON.stringify({ at: Date.now(), data });
    try {
      localStorage.setItem(store.key(url), text);
    } catch {
      // The phone's space for this site is full: start again with an empty copy.
      store.clear();
      try {
        localStorage.setItem(store.key(url), text);
      } catch {}
    }
  },
  each(fn) {
    try {
      for (const k of Object.keys(localStorage)) if (k.startsWith('c:')) fn(k);
    } catch {}
  },
  stale() {
    store.each((k) => {
      try {
        const v = JSON.parse(localStorage.getItem(k));
        v.at = 0;
        localStorage.setItem(k, JSON.stringify(v));
      } catch {}
    });
  },
  clear() {
    store.each((k) => localStorage.removeItem(k));
  },
};

// GET with the phone's copy: the saved answer at once (and a quiet check with the server), or the server's answer when nothing is saved yet.
async function cachedGet(url) {
  const hit = store.read(url);
  if (!hit) {
    const data = await api('GET', url);
    store.write(url, data);
    return data;
  }
  if (Date.now() - hit.at > FRESH_MS) {
    const token = renderToken;
    api('GET', url)
      .then((fresh) => {
        store.write(url, fresh);
        // Drawn again only when something changed, and only if the person is still on that screen.
        if (JSON.stringify(fresh) !== JSON.stringify(hit.data) && token === renderToken) render(true);
      })
      .catch(() => {});
  }
  return hit.data;
}

let toastTimer;
function toast(msg, isError) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast show' + (isError ? ' err' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = 'toast'), isError ? 5000 : 2800);
}

function sheet(html) {
  $('#sheet-body').innerHTML = html;
  $('#sheet').classList.add('open');
  const first = $('#sheet-body input, #sheet-body select, #sheet-body textarea');
  if (first) setTimeout(() => first.focus(), 50);
}
function closeSheet() {
  $('#sheet').classList.remove('open');
  $('#sheet-body').innerHTML = '';
}
GLOBAL_ACT.close = closeSheet;
GLOBAL_ACT.back = () => history.back();
document.addEventListener('keydown', (e) => e.key === 'Escape' && $('#sheet').classList.contains('open') && closeSheet());
// A row of chips where one is selected; can also fill an input.
GLOBAL_ACT.chip = (el) => {
  $$('.chip', el.parentElement).forEach((c) => c.classList.toggle('on', c === el));
  if (el.dataset.target) $('#' + el.dataset.target).value = el.dataset.val;
};
const chipVal = (groupId) => $(`#${groupId} .chip.on`)?.dataset.val ?? '';

// Something that cannot be undone easily: always asks first.
let confirmJob = null;
function askFirst(title, text, yes, job) {
  confirmJob = job;
  sheet(`<h3>${esc(title)}</h3>
    <p>${esc(text)}</p>
    <div class="btns"><button class="btn big" data-act="yesDo">${esc(yes)}</button><button class="btn light" data-act="close">No</button></div>`);
}
GLOBAL_ACT.yesDo = async () => {
  const job = confirmJob;
  if (!job) return;
  await job();
  confirmJob = null;
  closeSheet();
};

// ---------- search on a list that is already on the screen ----------
// searchBox() draws the box; every item of the list (data-item) is shown only when its text has the typed words.
const searchBox = (placeholder = 'Search') =>
  `<div class="filters"><input id="quick-q" type="search" placeholder="${esc(placeholder)}" data-input="quick" aria-label="${esc(placeholder)}" autocomplete="off"></div>`;
// Spaces, commas and the rupee sign do not matter: "1kg" finds "1 kg", "5000" finds "₹5,000".
const squash = (s) => String(s).toLowerCase().replace(/[\n\t]+/g, '|').replace(/[ ,₹]/g, '');
function quickApply() {
  const box = $('#quick-list');
  if (!box) return;
  const words = ($('#quick-q')?.value || '').split(/\s+/).map(squash).filter(Boolean);
  let shown = 0;
  const items = $$('[data-item]', box);
  for (const el of items) {
    el.hidden = false; // the text of a hidden item cannot be read
    const ok = words.every((w) => squash(el.innerText).includes(w));
    el.hidden = !ok;
    if (ok) shown++;
  }
  let none = $('#quick-none');
  if (!none) {
    none = document.createElement('div');
    none.id = 'quick-none';
    none.className = 'empty';
    none.textContent = 'Nothing found. Change the search.';
    box.after(none);
  }
  none.hidden = shown > 0 || !items.length;
}
GLOBAL_ACT.quick = quickApply;

// PIN and mobile boxes accept numbers only.
GLOBAL_ACT.digits = (el) => {
  const clean = el.value.replace(/\D/g, '');
  if (clean !== el.value) el.value = clean;
};

// ---------- routing ----------
function parseHash() {
  const [p, qs] = location.hash.replace(/^#\/?/, '').split('?');
  return { parts: p.split('/').filter(Boolean), query: Object.fromEntries(new URLSearchParams(qs || '')) };
}
function go(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}
const refresh = () => render(true);

// The bottom menu. The middle one is the main job: a new bill.
function navItems() {
  return [
    ['home', 'home', 'Home'],
    ['orders', 'orders', 'Orders'],
    can('orders') ? ['order', 'plus', 'New bill', 'main'] : null,
    ['customers', 'store', 'Customers'],
    ['more', 'menu', 'More'],
  ].filter(Boolean);
}
const PARENT = { bill: 'orders', customer: 'customers', customerform: 'customers', rates: 'customers', product: 'more', products: 'more' };
const TITLES = {
  orders: 'Orders', order: 'New bill', bill: 'Bill', customers: 'Customers', customer: 'Customer', customerform: 'Customer details', rates: 'Rates for this customer',
  products: 'Products', product: 'Product', more: 'More', reports: 'Sales reports', users: 'Users', user: 'User', settings: 'Business details', pin: 'Change PIN',
};

function shell(name) {
  document.body.classList.remove('login-page');
  if (!$('#main')) $('#app').innerHTML = '<header class="top" id="top"></header><main id="main"></main><nav class="bottom" id="nav" aria-label="Main menu"></nav>';
  const nav = navItems();
  const isRoot = nav.some((n) => n[0] === name);
  const tab = isRoot ? name : PARENT[name] || 'more';
  $('#top').innerHTML =
    (isRoot ? `<img class="logo-sm" src="icons/shahi-192.png" alt="">` : `<button class="icon-btn" data-act="back" aria-label="Back">${icon('back', 24)}</button>`) +
    `<div class="title">${esc(name === 'home' ? S.business : TITLES[name] || S.business)}</div>`;
  $('#nav').innerHTML = nav
    .map(([id, ico, label, cls]) => `<a href="#/${id}" class="${id === tab ? 'on' : ''} ${cls || ''}"${id === tab ? ' aria-current="page"' : ''}><span class="ico">${icon(ico, 24)}</span>${label}</a>`)
    .join('');
}

let renderToken = 0;
async function render(keepScroll) {
  if (!S.user) return viewLogin();
  if (Date.now() - S.bootAt > 15 * 60 * 1000) await loadBoot(true).catch(() => {});
  if (!S.user) return viewLogin();

  const { parts, query } = parseHash();
  const name = VIEWS[parts[0]] ? parts[0] : 'home';
  const token = ++renderToken;
  ACT = {};
  closeSheet();
  shell(name);
  const main = $('#main');
  if (keepScroll !== true) main.innerHTML = '<div class="loading">Loading…</div>';
  try {
    const html = await VIEWS[name](parts, query);
    if (token !== renderToken) return;
    main.innerHTML = html;
    if (keepScroll !== true) window.scrollTo(0, 0);
    if (ACT.ready) ACT.ready();
  } catch (e) {
    if (token === renderToken && S.user) main.innerHTML = `<div class="empty">${esc(e.message)}<div class="btns"><button class="btn light" data-act="retry">Try again</button></div></div>`;
  }
}
GLOBAL_ACT.retry = () => render();

async function runAct(name, el, e) {
  const fn = ACT[name] || GLOBAL_ACT[name];
  if (!fn) return;
  const btn = el.tagName === 'BUTTON' ? el : null;
  try {
    // stops double taps saving twice, and shows at once that the tap was taken
    if (btn) (btn.disabled = true), btn.classList.add('busy');
    await fn(el, e);
  } catch (err) {
    toast(err.message, true);
  } finally {
    if (btn) (btn.disabled = false), btn.classList.remove('busy');
  }
}
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  e.preventDefault();
  runAct(el.dataset.act, el, e);
});
document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-input]');
  if (el) runAct(el.dataset.input, el, e);
});
document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-change]');
  if (el) runAct(el.dataset.change, el, e);
});
document.addEventListener('submit', (e) => {
  const el = e.target.closest('form[data-submit]');
  if (!el) return;
  e.preventDefault();
  runAct(el.dataset.submit, $('button[type=submit]', el) || el, e);
});
window.addEventListener('hashchange', () => render());

// ---------- login: mobile number + 6 digit PIN ----------
function useBoot(boot) {
  S.boot = boot;
  S.bootAt = Date.now();
  S.user = boot.user;
  S.business = boot.settings.business_name || S.business;
  document.title = S.business;
}
// fromCache: when the app opens, who is logged in (and the settings) come from the phone's copy at once,
// and are checked with the server in the background (a login that ended shows the login screen then).
async function loadBoot(fromCache) {
  const hit = fromCache && store.read('/bootstrap');
  if (hit) {
    useBoot(hit.data);
    api('GET', '/bootstrap')
      .then((boot) => {
        store.write('/bootstrap', boot);
        const changed = JSON.stringify(boot) !== JSON.stringify(hit.data);
        useBoot(boot);
        if (changed) render(true);
      })
      .catch(() => {});
    return;
  }
  const boot = await api('GET', '/bootstrap');
  store.write('/bootstrap', boot);
  useBoot(boot);
}

const pinBox = (id, autocomplete, required = true) =>
  `<input id="${id}" class="pin" type="password" inputmode="numeric" maxlength="6" pattern="[0-9]{6}" title="6 numbers" autocomplete="${autocomplete}" data-input="digits" placeholder="••••••"${required ? ' required' : ''}>`;

function viewLogin() {
  ACT = {
    login: async () => {
      session.set((await api('POST', '/login', { mobile: $('#l-mobile').value, pin: $('#l-pin').value })).token);
      await loadBoot();
      if (location.hash && location.hash !== '#/home') location.hash = '#/home';
      else render();
    },
  };
  document.body.classList.add('login-page');
  $('#app').innerHTML = `<form class="login" data-submit="login">
    <img class="logo" src="icons/shahi-512.png" alt="SHAHI – Taste the Difference">
    <h1>${esc(S.business)}</h1>
    <p class="muted">Login with your mobile number and PIN</p>
    <label class="f" for="l-mobile">Mobile number</label>
    <input id="l-mobile" type="tel" inputmode="numeric" maxlength="10" pattern="[0-9]{10}" title="10 digit mobile number" autocomplete="username" data-input="digits" required>
    <label class="f" for="l-pin">6 digit PIN</label>
    ${pinBox('l-pin', 'current-password')}
    <div class="btns"><button class="btn big" type="submit">Login</button></div>
  </form>`;
}

// Changing the PIN is never forced; anyone can do it here when they want.
VIEWS.pin = async () => {
  ACT.savePin = async () => {
    if ($('#p-new').value !== $('#p-new2').value) throw new Error('Both new PINs must be the same');
    await api('POST', '/pin', { old_pin: $('#p-old').value, new_pin: $('#p-new').value });
    toast('PIN changed');
    go('#/home');
  };
  return `<form data-submit="savePin">
    <h2>Change PIN</h2><p class="muted">Do not tell your PIN to anyone.</p>
    <label class="f" for="p-old">Old PIN</label>${pinBox('p-old', 'current-password')}
    <label class="f" for="p-new">New PIN (6 numbers)</label>${pinBox('p-new', 'new-password')}
    <label class="f" for="p-new2">New PIN again</label>${pinBox('p-new2', 'new-password')}
    <div class="btns"><button class="btn big" type="submit">Save PIN</button></div>
  </form>`;
};

async function logout() {
  await api('POST', '/logout').catch(() => {});
  session.set('');
  store.clear();
  S.user = null;
  S.boot = null;
  resetDraft();
  location.hash = '';
  render();
}
GLOBAL_ACT.logout = logout;

// Saves a list as a CSV file (opens in Excel).
function downloadCsv(name, rows) {
  const cell = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const blob = new Blob(['﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
