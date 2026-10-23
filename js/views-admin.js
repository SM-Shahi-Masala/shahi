'use strict';
// More, sales reports, users and business details.

VIEWS.more = async () => {
  const item = (href, ico, label) => `<a href="${href}"><span class="ico">${icon(ico)}</span>${label}</a>`;
  return `<div class="card"><b>${esc(S.user.name)}</b><div class="muted small">${dots(ROLE_NAME[S.user.role], esc(S.user.mobile))}</div></div>
    <nav class="menu" aria-label="More">
      ${item('#/products', 'box', can('products') ? 'Products, pack sizes and rates' : 'Products and rates')}
      ${item('#/customers', 'store', 'Customers')}
      ${can('deliver') ? item('#/deliveries', 'truck', 'Deliveries') : ''}
      ${can('expenses') ? item('#/expenses', 'money', 'Expenses') : ''}
      ${can('reports') ? item('#/reports', 'chart', 'Sales reports') : ''}
      ${isOwner() ? item('#/users', 'users', 'Users and permissions') : ''}
      ${isOwner() ? item('#/settings', 'settings', 'Business details and bill') : ''}
      ${item('#/pin', 'lock', 'Change PIN')}
      <button data-act="logout"><span class="ico">${icon('power')}</span>Logout</button>
    </nav>
    <p class="muted small" style="text-align:center">Install: open the browser menu and choose “Add to Home screen”.</p>`;
};

// ---------- sales reports ----------
const REPORT = { period: 'month', from: '', to: '' };
VIEWS.reports = async () => {
  if (!can('reports')) throw new Error('You are not allowed to see reports.');
  const t = S.boot.today;
  const ranges = {
    today: [t, t],
    week: [addDaysStr(t, -6), t],
    month: [t.slice(0, 8) + '01', t],
    lastmonth: (() => {
      const first = new Date(t.slice(0, 8) + '01T00:00:00Z');
      first.setUTCDate(0); // last day of last month
      const end = first.toISOString().slice(0, 10);
      return [end.slice(0, 8) + '01', end];
    })(),
  };
  const [from, to] = REPORT.period === 'custom' ? [REPORT.from, REPORT.to] : ranges[REPORT.period];
  const r = await cachedGet(`/reports/sales?from=${from}&to=${to}`);
  ACT.period = (el) => {
    REPORT.period = el.dataset.val;
    refresh();
  };
  ACT.custom = () => {
    Object.assign(REPORT, { period: 'custom', from: $('#r-from').value, to: $('#r-to').value });
    refresh();
  };
  const file = (what) => `SM-Shahi-${what}-${r.from}-to-${r.to}.csv`;
  ACT.csvDays = () => downloadCsv(file('sales-by-day'), [['Date', 'Bills', 'Sales'], ...r.days.map((d) => [d.day, d.bills, d.total])]);
  ACT.csvProducts = () => downloadCsv(file('sales-by-product'), [['Product', 'Pack', 'Quantity', 'Sales'], ...r.products.map((p) => [p.product, p.pack, p.qty, p.total])]);
  ACT.csvCustomers = () => downloadCsv(file('sales-by-customer'), [['Customer', 'Bills', 'Sales'], ...r.customers.map((c) => [c.customer, c.bills, c.total])]);
  ACT.csvBills = async () => {
    const { list } = await api('GET', `/orders?from=${r.from}&to=${r.to}`);
    const rows = [['Bill no', 'Date', 'Customer', 'Mobile', 'Product', 'Pack', 'Qty', 'Rate', 'Amount', 'Bill total', 'Status', 'Made by']];
    for (const o of list.reverse()) for (const i of o.items) rows.push([o.bill_no, o.bill_date, o.customer_name, o.customer_mobile, i.product_name, i.pack_name, i.quantity, i.rate, i.line_total, o.total, o.status, o.created_by_name]);
    downloadCsv(file('bills'), rows);
    if (list.length >= 300) toast('Only the last 300 bills are in the file. Choose a shorter period for all of them.', true);
  };
  const table = (head, rows, csvAct) =>
    rows.length
      ? `<div class="table-wrap"><table><thead><tr>${head.map((h, i) => `<th class="${i ? 'num' : ''}">${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>
        ${csvAct ? `<div class="btns"><button class="btn light sm" data-act="${csvAct}">Download (Excel / CSV)</button></div>` : ''}`
      : '<div class="empty">No sales in this period.</div>';
  return `<div class="chips">${[['today', 'Today'], ['week', 'Last 7 days'], ['month', 'This month'], ['lastmonth', 'Last month'], ['custom', 'Choose dates']]
    .map(([v, l]) => `<button class="chip${REPORT.period === v ? ' on' : ''}" data-act="period" data-val="${v}">${l}</button>`)
    .join('')}</div>
    ${REPORT.period === 'custom' ? `<form class="filters" data-submit="custom"><input id="r-from" type="date" value="${esc(REPORT.from || ranges.month[0])}" aria-label="From" required><input id="r-to" type="date" value="${esc(REPORT.to || t)}" aria-label="To" required><button class="btn sm" type="submit" style="flex:none">Show</button></form>` : ''}
    <p class="muted">${fullDate(r.from)} to ${fullDate(r.to)}</p>
    <div class="tiles">
      <div class="tile"><b>${rs(r.sum.total)}</b><span>Sales</span></div>
      <div class="tile"><b>${num(r.sum.bills)}</b><span>Bills</span></div>
      <div class="tile"><b>${rs(r.sum.bills ? r.sum.total / r.sum.bills : 0)}</b><span>Average bill</span></div>
      <div class="tile"><b>${num(r.cancelled.bills)}</b><span>Cancelled (${rs(r.cancelled.total)})</span></div>
      <div class="tile"><b>${rs(r.received.total)}</b><span>Money received</span></div>
      <div class="tile"><b>${rs(r.spent.total)}</b><span>Expenses</span></div>
      <div class="tile"><b>${num(r.pending.bills)}</b><span>Not delivered yet (${rs(r.pending.total)})</span></div>
    </div>
    <div class="btns"><button class="btn light" data-act="csvBills">Download all bills of this period (Excel / CSV)</button></div>
    <h3>By product and pack</h3>
    ${table(['Product', 'Qty', 'Sales'], r.products.map((p) => `<tr><td class="wrap">${esc(p.product)} <b>${esc(p.pack)}</b></td><td class="num">${num(p.qty)}</td><td class="num">${rs(p.total)}</td></tr>`), 'csvProducts')}
    <h3>By customer</h3>
    ${table(['Customer', 'Bills', 'Sales'], r.customers.map((c) => `<tr><td class="wrap"><a href="#/customer/${c.customer_id}">${esc(c.customer)}</a></td><td class="num">${c.bills}</td><td class="num">${rs(c.total)}</td></tr>`), 'csvCustomers')}
    <h3>By day</h3>
    ${table(['Date', 'Bills', 'Sales'], r.days.map((d) => `<tr><td>${fullDate(d.day)}</td><td class="num">${d.bills}</td><td class="num">${rs(d.total)}</td></tr>`), 'csvDays')}
    ${r.staff.length > 1 ? `<h3>By person</h3>${table(['Made by', 'Bills', 'Sales'], r.staff.map((s) => `<tr><td>${esc(s.name)}</td><td class="num">${s.bills}</td><td class="num">${rs(s.total)}</td></tr>`))}` : ''}`;
};

// ---------- expenses ----------
const EXP = { month: '' };
VIEWS.expenses = async () => {
  if (!can('expenses')) throw new Error('You are not allowed to see expenses.');
  const t = S.boot.today;
  const month = EXP.month || t.slice(0, 7);
  const d = await cachedGet(`/expenses?month=${month}`);
  const shift = (n) => {
    const x = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5, 7) - 1 + n, 1));
    return x.toISOString().slice(0, 7);
  };
  ACT.prev = () => ((EXP.month = shift(-1)), refresh());
  ACT.next = () => ((EXP.month = shift(1)), refresh());
  ACT.add = () => {
    ACT.saveExpense = async () => {
      await api('POST', '/expenses', { date: $('#ex-date').value, category: chipVal('ex-type'), amount: $('#ex-amount').value, mode: chipVal('ex-mode'), note: $('#ex-note').value });
      closeSheet();
      toast('Expense saved');
      refresh();
    };
    sheet(`<h3>New expense</h3>
      <form data-submit="saveExpense">
        <label class="f">Spent on</label>
        <div class="chips" id="ex-type">${S.boot.expense_types.map((x, i) => `<button type="button" class="chip${i ? '' : ' on'}" data-act="chip" data-val="${esc(x)}">${esc(x)}</button>`).join('')}</div>
        <label class="f" for="ex-amount">Amount ₹</label><input id="ex-amount" type="number" inputmode="decimal" min="0.01" step="0.01" required>
        <label class="f">Paid by</label>${modeChips('ex-mode')}
        <label class="f" for="ex-date">Date</label><input id="ex-date" type="date" value="${t}" max="${t}" required>
        <label class="f" for="ex-note">Note (needed for "Other")</label><input id="ex-note" maxlength="200" placeholder="What was bought, for what">
        <div class="btns"><button class="btn big" type="submit">Save expense</button></div>
      </form>`);
  };
  ACT.remove = (el) =>
    askFirst('Delete this expense?', 'Use this only for a wrong entry.', 'Yes, delete', async () => {
      await api('POST', `/expenses/${el.dataset.id}/delete`);
      toast('Expense deleted');
      refresh();
    });
  const [y, m] = month.split('-');
  return `<div class="btns"><button class="btn big" data-act="add">${icon('plus')} New expense</button></div>
    <div class="row" style="margin:12px 0"><button class="btn light sm" data-act="prev" aria-label="Month before">‹</button><b>${MONTHS[m - 1]} ${y}</b>
      <button class="btn light sm" data-act="next" aria-label="Next month"${month >= t.slice(0, 7) ? ' disabled' : ''}>›</button></div>
    <div class="banner bad"><span>Total spent</span><b>${rs(d.total)}</b></div>
    ${d.types.length ? `<div class="table-wrap"><table><thead><tr><th>Spent on</th><th class="num">Times</th><th class="num">Amount</th></tr></thead><tbody>${d.types.map((x) => `<tr><td>${esc(x.category)}</td><td class="num">${x.n}</td><td class="num">${rs(x.total)}</td></tr>`).join('')}</tbody></table></div>` : ''}
    <h3>Every expense</h3>
    ${d.list.length ? searchBox('Search expenses') : ''}
    <div id="quick-list">${d.list
      .map(
        (e) => `<div class="card" data-item><div class="row"><b>${esc(e.category)}</b><b>${rs(e.amount)}</b></div>
        <div class="row small muted"><span>${dots(dayLabel(e.date), esc(e.mode), esc(e.note), 'by ' + esc(e.by))}</span>
        ${isOwner() ? `<button class="btn danger sm" data-act="remove" data-id="${e.id}">Delete</button>` : ''}</div></div>`
      )
      .join('')}</div>
    ${d.list.length ? '' : '<div class="empty">No expenses in this month.</div>'}`;
};

// ---------- users and permissions (owner only) ----------
let USERS_CACHE = null;
VIEWS.users = async () => {
  if (!isOwner()) throw new Error('Only the owner can open this.');
  USERS_CACHE = await api('GET', '/users');
  return `<div class="btns"><a class="btn big" href="#/user/new">${icon('plus')} Add a person</a></div>
    <div id="quick-list">${USERS_CACHE.list
      .map(
        (u) => `<a class="card" href="#/user/${u.id}" data-item>
        <div class="row"><b>${esc(u.name)}</b><span class="tag ${u.active ? 'active' : 'archived'}">${u.active ? ROLE_NAME[u.role] : 'Switched off'}</span></div>
        <div class="muted small">${esc(u.mobile)}</div>
        ${u.role === 'owner' ? '<div class="small muted">Can do everything</div>' : `<div class="small muted">${u.perms.map((p) => esc(S.boot.perms[p])).join(' · ') || 'Nothing allowed yet'}</div>`}
      </a>`
      )
      .join('')}</div>`;
};

VIEWS.user = async (parts) => {
  if (!isOwner()) throw new Error('Only the owner can open this.');
  USERS_CACHE = USERS_CACHE || (await api('GET', '/users'));
  const u = parts[1] === 'new' ? null : USERS_CACHE.list.find((x) => String(x.id) === parts[1]);
  if (parts[1] !== 'new' && !u) throw new Error('Person not found');
  const role = u ? u.role : 'staff';
  const perms = new Set(u ? u.perms : USERS_CACHE.defaults.staff);
  ACT.role = (el) => {
    GLOBAL_ACT.chip(el);
    $('#uf-perms').hidden = el.dataset.val === 'owner';
    // A new person gets the usual permissions of the chosen role.
    if (!u && USERS_CACHE.defaults[el.dataset.val]) $$('[data-perm]').forEach((c) => (c.checked = USERS_CACHE.defaults[el.dataset.val].includes(c.value)));
  };
  ACT.save = async () => {
    const body = {
      name: $('#uf-name').value,
      mobile: $('#uf-mobile').value,
      role: chipVal('uf-role'),
      perms: $$('[data-perm]:checked').map((c) => c.value),
      pin: $('#uf-pin').value,
      active: u ? $('#uf-active').checked : true,
    };
    await api(u ? 'PUT' : 'POST', u ? `/users/${u.id}` : '/users', body);
    toast(u ? 'Saved' : `Added. Tell ${body.name} the mobile number and PIN to login.`);
    if (u && u.id === S.user.id) await loadBoot();
    go('#/users');
  };
  return `<form data-submit="save">
    <h2>${u ? esc(u.name) : 'Add a person'}</h2>
    <label class="f" for="uf-name">Name</label><input id="uf-name" value="${esc(u?.name)}" required maxlength="80">
    <label class="f" for="uf-mobile">Mobile number (used to login)</label>
    <input id="uf-mobile" type="tel" inputmode="numeric" maxlength="10" pattern="[0-9]{10}" data-input="digits" value="${esc(u?.mobile)}" required>
    <label class="f">Role</label>
    <div class="chips" id="uf-role">${['owner', 'manager', 'staff'].map((r) => `<button type="button" class="chip${r === role ? ' on' : ''}" data-act="role" data-val="${r}">${ROLE_NAME[r]}</button>`).join('')}</div>
    <div id="uf-perms"${role === 'owner' ? ' hidden' : ''}>
      <label class="f">Allowed to</label>
      ${Object.entries(S.boot.perms).map(([k, label]) => `<label class="check"><input type="checkbox" data-perm value="${k}"${perms.has(k) ? ' checked' : ''}> ${esc(label)}</label>`).join('')}
    </div>
    <p class="muted small">Owner: can do everything, including users and business details.</p>
    <label class="f" for="uf-pin">${u ? 'New PIN (leave empty to keep the old one)' : '6 digit PIN'}</label>
    ${pinBox('uf-pin', 'new-password', !u)}
    ${u ? `<label class="check"><input type="checkbox" id="uf-active"${u.active ? ' checked' : ''}> Can login (untick to switch off; old bills stay)</label>` : ''}
    <div class="btns"><button class="btn big" type="submit">Save</button></div>
  </form>`;
};

// ---------- business details and bill (owner only) ----------
VIEWS.settings = async () => {
  if (!isOwner()) throw new Error('Only the owner can open this.');
  const { settings: s } = await api('GET', '/settings');
  const field = (key, label, extra = '') => `<label class="f" for="s-${key}">${label}</label><input id="s-${key}" value="${esc(s[key] || '')}" ${extra}>`;
  ACT.save = async () => {
    const body = {};
    for (const el of $$('[id^="s-"]')) body[el.id.slice(2)] = el.value;
    await api('PUT', '/settings', body);
    await loadBoot();
    toast('Saved');
    go('#/more');
  };
  return `<form data-submit="save">
    <h2>Business details</h2>
    <p class="muted">Printed on every bill.</p>
    ${field('business_name', 'Business name', 'required maxlength="80"')}
    <label class="f" for="s-business_address">Address</label><textarea id="s-business_address" maxlength="300">${esc(s.business_address || '')}</textarea>
    ${field('business_phone', 'Phone', 'maxlength="40"')}
    ${field('business_whatsapp', 'Business WhatsApp number', 'type="tel" inputmode="numeric" maxlength="13" placeholder="10 digit mobile number"')}
    <p class="muted small">Bills can be sent to this number with one tap, and it is printed on the bill.</p>
    ${field('business_gstin', 'GSTIN (optional)', 'maxlength="15" style="text-transform:uppercase"')}
    <h3>Bill</h3>
    ${field('bill_prefix', 'Bill number starts with', 'required maxlength="6" style="text-transform:uppercase"')}
    <p class="muted small">Bill numbers look like ${esc((s.bill_prefix || 'SH').toUpperCase())}-${S.boot.today.slice(0, 4)}-000001 and start again from 1 every year.</p>
    ${field('bill_note', 'Note on every bill (when the bill has no own note)', 'maxlength="300"')}
    ${field('bill_footer', 'Last line of the bill', 'maxlength="120"')}
    <div class="btns"><button class="btn big" type="submit">Save</button></div>
  </form>`;
};
