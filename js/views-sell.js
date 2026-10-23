'use strict';
// Home, orders, deliveries, the new bill, the bill page and changing a bill.

// One small card per order, used on Home, Orders and the customer page.
const orderCard = (o) => `<a class="card" href="#/bill/${o.id}" data-item>
  <div class="row"><b>${esc(o.customer_name)}</b><b>${rs(o.total)}</b></div>
  <div class="row muted small"><span>${dots(esc(o.bill_no), dayLabel(o.bill_date), plural(o.lines, 'item'))}</span>${STATUS_TAG[o.status] || ''}</div>
  ${o.items ? `<div class="small muted">${o.items.map((i) => `${esc(i.product_name)} ${esc(i.pack_name)} × ${i.quantity}`).join(', ')}</div>` : ''}
  ${o.status === 'delivered' && o.paid ? `<div class="small green">Paid ${rs(o.paid)}${o.paid_how ? ' · ' + esc(o.paid_how) : ''}</div>` : ''}
  ${can('all_orders') ? `<div class="small muted">By ${esc(o.created_by_name)}</div>` : ''}
</a>`;

// Cash, UPI ... as chips; the first one is chosen.
const modeChips = (id) => `<div class="chips" id="${id}">${S.boot.pay_modes.map((m, i) => `<button type="button" class="chip${i ? '' : ' on'}" data-act="chip" data-val="${m}">${m}</button>`).join('')}</div>`;

// "Mark delivered": the money received now (empty = 0). What is not paid goes to the customer's balance.
function deliverSheet(o, done) {
  const owes = Math.max(0, o.balance + o.total);
  const after = () => {
    const paid = Number($('#d-amount').value) || 0;
    const left = o.balance + o.total - paid;
    $('#d-after').innerHTML = left > 0 ? `Balance after: <b class="red">${rs(left)}</b>` : left < 0 ? `Paid in advance after: <b class="green">${rs(-left)}</b>` : '<b class="green">Fully paid</b>';
  };
  ACT.dAfter = after;
  ACT.dAll = () => {
    $('#d-amount').value = owes;
    after();
  };
  ACT.doDeliver = async () => {
    const d = await api('POST', `/orders/${o.id}/deliver`, { amount: $('#d-amount').value, mode: chipVal('d-mode') });
    closeSheet();
    toast(d.balance > 0 ? `Delivered. Balance of ${o.customer_name}: ${rs(d.balance)}` : 'Delivered');
    done();
  };
  sheet(`<h3>Delivered to ${esc(o.customer_name)}?</h3>
    <div class="card"><ul class="items">
      <li><span class="muted">This bill (${esc(o.bill_no)})</span><span>${rs(o.total)}</span></li>
      ${o.balance ? `<li><span class="muted">${o.balance < 0 ? 'Paid in advance' : 'Old balance'}</span><span>${rs(Math.abs(o.balance))}</span></li>` : ''}
      <li><b>Total to pay</b><b>${rs(owes)}</b></li>
    </ul></div>
    <form data-submit="doDeliver">
      <label class="f" for="d-amount">Money received now ₹ (0 if nothing)</label>
      <div class="filters"><input id="d-amount" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0" data-input="dAfter">
        <button type="button" class="btn light sm" style="flex:none" data-act="dAll">All ${rs(owes)}</button></div>
      <label class="f">Paid by</label>${modeChips('d-mode')}
      <p id="d-after" class="small">Balance after: <b class="red">${rs(owes)}</b></p>
      <div class="btns"><button class="btn big" type="submit">${icon('truck', 20)} Mark delivered</button></div>
    </form>`);
}

// Money a customer pays without a delivery.
function receiveSheet(c, done) {
  ACT.doReceive = async () => {
    const d = await api('POST', '/payments', { customer_id: c.id, amount: $('#rm-amount').value, mode: chipVal('rm-mode'), note: $('#rm-note').value });
    closeSheet();
    toast(`Saved. Balance of ${c.name}: ${rs(d.balance)}`);
    done();
  };
  sheet(`<h3>Money from ${esc(c.name)}</h3>
    <p class="muted">Balance now: <b>${rs(c.balance)}</b></p>
    <form data-submit="doReceive">
      <label class="f" for="rm-amount">Amount received ₹</label>
      <input id="rm-amount" type="number" inputmode="decimal" min="0.01" step="0.01" required ${c.balance > 0 ? `value="${c.balance}"` : ''}>
      <label class="f">Paid by</label>${modeChips('rm-mode')}
      <label class="f" for="rm-note">Note (optional)</label><input id="rm-note" maxlength="200">
      <div class="btns"><button class="btn big" type="submit">${icon('money', 20)} Save money received</button></div>
    </form>`);
}

// ---------- home ----------
VIEWS.home = async () => {
  const d = await cachedGet('/home');
  ACT.findCustomer = () => go('#/customers?q=' + encodeURIComponent($('#h-q').value.trim()));
  const start = [];
  if (can('products') && !d.counts.products) start.push(`<a class="banner warn" href="#/product/new"><span>Start here: add your first product, its pack sizes and rates.</span>${icon('plus')}</a>`);
  if (can('orders') && !d.counts.customers) start.push(`<a class="banner warn" href="#/customerform"><span>Add your first customer.</span>${icon('plus')}</a>`);
  return `<p class="muted">Hello ${esc(S.user.name)} · ${fullDate(d.today)}</p>
    ${start.join('')}
    ${can('orders') ? `<div class="btns"><a class="btn big" href="#/order">${icon('plus')} New bill</a></div>` : ''}
    ${d.pending.n && can('deliver') ? `<a class="banner warn" href="#/deliveries"><span>${icon('truck', 20)} ${plural(d.pending.n, 'order')} to deliver · ${rs(d.pending.total)}</span><b>Open</b></a>` : ''}
    <div class="tiles">
      <div class="tile"><b>${num(d.day.n)}</b><span>Bills today</span></div>
      <div class="tile"><b>${rs(d.day.total)}</b><span>Sales today</span></div>
      <div class="tile"><b>${num(d.month.n)}</b><span>Bills this month</span></div>
      <div class="tile"><b>${rs(d.month.total)}</b><span>Sales this month</span></div>
      ${d.received ? `<div class="tile"><b>${rs(d.received.total)}</b><span>Money received today</span></div>` : ''}
      ${d.spent ? `<a class="tile" href="#/expenses"><b>${rs(d.spent.total)}</b><span>Expenses today</span></a>` : ''}
    </div>
    ${can('all_orders') ? '' : '<p class="muted small">These numbers count only the bills you made.</p>'}
    <form class="filters" data-submit="findCustomer" role="search">
      <input id="h-q" type="search" placeholder="Find a customer: name or mobile" aria-label="Find a customer" autocomplete="off">
      <button class="btn light" type="submit" style="flex:none">${icon('search', 20)}</button>
    </form>
    <h3>Recent bills</h3>
    ${d.recent.map(orderCard).join('') || '<div class="empty">No bills yet.</div>'}
    ${d.recent.length ? '<div class="btns"><a class="btn light" href="#/orders">All orders</a></div>' : ''}`;
};

// ---------- orders ----------
const ORDER_FILTER = { period: 'today', status: '' };
const PERIODS = [
  ['today', 'Today'],
  ['yesterday', 'Yesterday'],
  ['week', 'Last 7 days'],
  ['month', 'This month'],
  ['all', 'All'],
];
function periodRange(p) {
  const t = S.boot.today;
  if (p === 'today') return [t, t];
  if (p === 'yesterday') return [addDaysStr(t, -1), addDaysStr(t, -1)];
  if (p === 'week') return [addDaysStr(t, -6), t];
  if (p === 'month') return [t.slice(0, 8) + '01', t];
  return ['', ''];
}

VIEWS.orders = async () => {
  const [from, to] = periodRange(ORDER_FILTER.period);
  const qs = new URLSearchParams({ from, to, status: ORDER_FILTER.status });
  const { list } = await cachedGet('/orders?' + qs);
  ACT.period = (el) => {
    ORDER_FILTER.period = el.dataset.val;
    refresh();
  };
  ACT.status = (el) => {
    ORDER_FILTER.status = el.dataset.val;
    refresh();
  };
  const active = list.filter((o) => o.status !== 'cancelled');
  return `${can('orders') ? `<div class="btns"><a class="btn big" href="#/order">${icon('plus')} New bill</a></div>` : ''}
    <div class="chips">${PERIODS.map(([v, l]) => `<button class="chip${ORDER_FILTER.period === v ? ' on' : ''}" data-act="period" data-val="${v}">${l}</button>`).join('')}</div>
    <div class="chips">${[['', 'All bills'], ['pending', 'To deliver'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled']].map(([v, l]) => `<button class="chip${ORDER_FILTER.status === v ? ' on' : ''}" data-act="status" data-val="${v}">${l}</button>`).join('')}</div>
    <div class="banner ok"><span>${plural(active.length, 'bill')}</span><span>${rs(active.reduce((s, o) => s + o.total, 0))}</span></div>
    ${searchBox('Search: customer, bill no, product, amount')}
    <div id="quick-list">${list.map(orderCard).join('')}</div>
    ${list.length ? '' : '<div class="empty">No bills in this period.</div>'}
    ${list.length >= 300 ? '<p class="muted small">Only the last 300 bills are shown. Choose a shorter period.</p>' : ''}`;
};

// ---------- deliveries: orders waiting to be delivered, the oldest first ----------
VIEWS.deliveries = async () => {
  if (!can('deliver')) throw new Error('You are not allowed to deliver orders.');
  const { list } = await cachedGet('/orders?status=pending');
  ACT.deliver = (el) => deliverSheet(list.find((o) => o.id === +el.dataset.id), refresh);
  const total = list.reduce((s, o) => s + o.total, 0);
  return `<div class="banner ${list.length ? 'warn' : 'ok'}"><span>${list.length ? plural(list.length, 'order') + ' to deliver' : 'Nothing to deliver'}</span><b>${rs(total)}</b></div>
    ${list.length ? searchBox('Search: customer, bill no, product') : ''}
    <div id="quick-list">${list
      .map(
        (o) => `<div class="card" data-item>
        <a href="#/bill/${o.id}" class="row" style="color:inherit"><b>${esc(o.customer_name)}</b><b>${rs(o.total)}</b></a>
        <div class="row muted small"><span>${dots(esc(o.bill_no), dayLabel(o.bill_date), o.customer_mobile)}</span>${o.balance ? balTag(o.balance) : ''}</div>
        <div class="small muted">${o.items.map((i) => `${esc(i.product_name)} ${esc(i.pack_name)} × ${i.quantity}`).join(', ')}</div>
        ${o.customer_address ? `<div class="small muted pre">${esc(o.customer_address)}</div>` : ''}
        <div class="btns"><button class="btn" data-act="deliver" data-id="${o.id}">${icon('truck', 20)} Mark delivered</button>
          ${o.customer_mobile ? tel(o.customer_mobile, 'btn light') : ''}</div>
      </div>`
      )
      .join('')}</div>
    ${list.length ? '' : '<div class="empty">Every order is delivered.</div>'}`;
};

// ---------- new bill ----------
// The bill being made stays here while the person moves around the app, until it is saved.
const DRAFT = { customer: null, qty: {}, note: '' };
function resetDraft() {
  Object.assign(DRAFT, { customer: null, qty: {}, note: '' });
}
let CUSTOMERS_CACHE = null;

// Adding a customer quickly without leaving the bill: name, mobile, address, old balance.
function quickCustomerSheet(name, onSaved) {
  ACT.saveQuickCustomer = async () => {
    const body = { name: $('#qc-name').value, mobile: $('#qc-mobile').value, address: $('#qc-address').value, opening_balance: $('#qc-balance').value };
    const d = await api('POST', '/customers', body);
    CUSTOMERS_CACHE = null;
    if (d.exists) toast('This customer is already saved. It is chosen now.');
    closeSheet();
    onSaved(d.exists || d.customer);
  };
  sheet(`<h3>New customer</h3>
    <form data-submit="saveQuickCustomer">
      <label class="f" for="qc-name">Name</label><input id="qc-name" value="${esc(name)}" required maxlength="120">
      <label class="f" for="qc-mobile">Mobile number (for WhatsApp)</label>
      <input id="qc-mobile" type="tel" inputmode="numeric" maxlength="10" data-input="digits" placeholder="10 digits">
      <label class="f" for="qc-address">Address</label><textarea id="qc-address" maxlength="400"></textarea>
      <label class="f" for="qc-balance">Old balance ₹ (money they already owe, optional)</label>
      <input id="qc-balance" type="number" inputmode="decimal" step="0.01" placeholder="0">
      <div class="btns"><button class="btn big" type="submit">Save and use</button></div>
    </form>`);
}

VIEWS.order = async (parts, query) => {
  if (!can('orders')) throw new Error('You are not allowed to make bills.');
  if (query.customer && String(DRAFT.customer?.id) !== query.customer) {
    DRAFT.customer = (await api('GET', `/customers/${encodeURIComponent(query.customer)}`)).customer;
    DRAFT.qty = {};
  }
  const chooseCustomer = (c) => {
    if (DRAFT.customer?.id !== c.id) DRAFT.qty = {};
    DRAFT.customer = c;
    if (location.hash.includes('customer=')) go('#/order');
    else refresh();
  };

  // Step 1: the customer.
  if (!DRAFT.customer) {
    CUSTOMERS_CACHE = (await cachedGet('/customers')).list;
    const list = CUSTOMERS_CACHE;
    const results = (q) => {
      const words = q.split(/\s+/).map(squash).filter(Boolean);
      const hits = list.filter((c) => words.every((w) => squash(`${c.name}|${c.mobile}|${c.address}`).includes(w))).slice(0, 12);
      return (
        hits.map((c) => `<button data-act="pickCustomer" data-id="${c.id}"><div class="row"><b>${esc(c.name)}</b>${c.balance ? balTag(c.balance) : ''}</div><div class="muted small">${dots(esc(c.mobile), esc(c.address))}</div></button>`).join('') +
        `<button class="add" data-act="newCustomer">${icon('plus', 18)} New customer${q.trim() ? `: “${esc(q.trim())}”` : ''}</button>`
      );
    };
    ACT.custSearch = (el) => ($('#c-results').innerHTML = results(el.value));
    ACT.pickCustomer = (el) => chooseCustomer(list.find((c) => c.id === +el.dataset.id));
    ACT.newCustomer = () => quickCustomerSheet($('#c-q').value.trim(), chooseCustomer);
    ACT.ready = () => $('#c-q').focus();
    return `<h2>Who is the bill for?</h2>
      <label class="f" for="c-q">Customer</label>
      <input id="c-q" type="search" placeholder="Search customer: name or mobile" data-input="custSearch" autocomplete="off">
      <div class="results" id="c-results">${results('')}</div>`;
  }

  // Step 2: products and quantities, with the rate this customer pays.
  const c = DRAFT.customer;
  const { list } = await cachedGet(`/products?customer_id=${c.id}`);
  const VARS = {};
  for (const p of list) for (const v of p.variants) VARS[v.id] = { ...v, product: p.name };
  // Packs that are no longer sold drop out of the bill.
  for (const id of Object.keys(DRAFT.qty)) if (!VARS[id]) delete DRAFT.qty[id];

  const update = () => {
    let total = 0;
    let count = 0;
    for (const [id, v] of Object.entries(VARS)) {
      const q = DRAFT.qty[id] || 0;
      const box = $(`#q-${id}`);
      if (!box) continue;
      if (document.activeElement !== box) box.value = q || '';
      box.closest('.qty').classList.toggle('has', q > 0);
      $(`#a-${id}`).textContent = q ? `${q} × ${rs(v.rate)} = ${rs(q * v.rate)}` : '';
      total += q * v.rate;
      if (q) count++;
    }
    $('#o-total').textContent = rs(total);
    $('#o-count').textContent = count ? plural(count, 'item') : 'No item yet';
    if (c.balance) $('#o-due').textContent = `With old balance: ${rs(total + c.balance)}`;
  };
  const setQty = (id, q) => {
    q = Math.max(0, Math.min(100000, Math.floor(Number(q) || 0)));
    if (q) DRAFT.qty[id] = q;
    else delete DRAFT.qty[id];
    update();
  };
  ACT.inc = (el) => setQty(el.dataset.v, (DRAFT.qty[el.dataset.v] || 0) + 1);
  ACT.dec = (el) => setQty(el.dataset.v, (DRAFT.qty[el.dataset.v] || 0) - 1);
  ACT.setQty = (el) => setQty(el.dataset.v, el.value.replace(/\D/g, ''));
  ACT.note = (el) => (DRAFT.note = el.value);
  ACT.changeCustomer = () => {
    DRAFT.customer = null;
    DRAFT.qty = {};
    go('#/order');
  };
  ACT.ready = update;
  ACT.createBill = async () => {
    const items = Object.entries(DRAFT.qty).map(([variant_id, quantity]) => ({ variant_id: +variant_id, quantity }));
    if (!items.length) throw new Error('Add at least one product: tap + next to a pack size');
    const d = await api('POST', '/orders', { customer_id: c.id, items, note: DRAFT.note });
    resetDraft();
    go(`#/bill/${d.id}?new=1`);
  };

  const products = list
    .map(
      (p) => `<div class="card" data-item>
      <div class="product">${pic(p)}<div class="grow"><div class="name">${esc(p.name)}</div>${p.description ? `<div class="muted small">${esc(p.description)}</div>` : ''}</div></div>
      ${p.variants
        .map(
          (v) => `<div class="pick">
          ${v.image_id ? pic(v) : ''}
          <div class="grow"><span class="pack">${esc(v.pack_name)}</span> · <b>${rs(v.rate)}</b> ${v.customer_rate != null ? '<span class="tag own">own rate</span>' : ''}
            <div class="small red" id="a-${v.id}"></div></div>
          <div class="qty"><button data-act="dec" data-v="${v.id}" aria-label="One less ${esc(v.pack_name)}">−</button><input id="q-${v.id}" inputmode="numeric" data-input="setQty" data-v="${v.id}" aria-label="How many ${esc(p.name)} ${esc(v.pack_name)}" placeholder="0"><button data-act="inc" data-v="${v.id}" aria-label="One more ${esc(v.pack_name)}">+</button></div>
        </div>`
        )
        .join('')}
    </div>`
    )
    .join('');

  return `<div class="chosen"><div class="grow"><b>${esc(c.name)}</b><div class="muted small">${dots(esc(c.mobile), esc(c.address))}</div>
      ${c.balance ? `<div class="small">Balance: ${balTag(c.balance)}</div>` : ''}</div>
      <button class="btn light sm" data-act="changeCustomer">Change</button></div>
    ${list.length ? searchBox('Search product or pack size') : ''}
    <div id="quick-list">${products}</div>
    ${list.length ? '' : `<div class="empty">No products to sell yet.${can('products') ? '<div class="btns"><a class="btn" href="#/product/new">Add a product</a></div>' : ' Ask the owner to add products.'}</div>`}
    <label class="f" for="o-note">Note on the bill (optional)</label>
    <input id="o-note" maxlength="300" value="${esc(DRAFT.note)}" data-input="note" placeholder="${esc(S.boot.settings.bill_note || '')}">
    <div class="sticky-foot">
      <div class="row"><span class="muted" id="o-count"></span><span class="total" id="o-total"></span></div>
      ${c.balance ? '<div class="small muted" id="o-due" style="text-align:right"></div>' : ''}
      <div class="btns"><button class="btn big" data-act="createBill">Create bill</button></div>
    </div>`;
};

// ---------- the bill ----------
// Who may change this bill: anyone who makes bills until it is delivered, after that only the owner.
const canEdit = (o) => o.status !== 'cancelled' && can('orders') && (o.status === 'pending' || isOwner());

VIEWS.bill = async (parts, query) => {
  const o = (await cachedGet(`/orders/${encodeURIComponent(parts[1] || '')}`)).order;
  const s = S.boot.settings;
  const fileName = `Bill-${o.bill_no}.pdf`;
  // The bill link: works without login, but only with the long random code of this bill.
  const pdfUrl = `${API_URL}/bill/${o.bill_token}`;
  const money = balanceRows(o);
  const message = [
    `*${S.business}*`,
    `Bill ${o.bill_no} · ${fullDate(o.bill_date)}`,
    `Customer: ${o.customer_name}`,
    '',
    ...o.items.map((i) => `${i.product_name} ${i.pack_name} × ${i.quantity} @ ${rs(i.rate)} = ${rs(i.line_total)}`),
    '',
    `*Total: ${rs2(o.total)}*`,
    ...money.map(([label, v, strong]) => (strong ? `*${label}: ${rs2(v)}*` : `${label}: ${rs2(v)}`)),
    o.status === 'cancelled' ? '*THIS BILL WAS CANCELLED*' : '',
    o.note || s.bill_note ? '\n' + (o.note || s.bill_note) : '',
    `\nBill (PDF): ${pdfUrl}`,
  ]
    .filter((x) => x !== '')
    .join('\n');
  const wa = (number) => `https://wa.me/${number ? '91' + encodeURIComponent(number) : ''}?text=${encodeURIComponent(message)}`;

  // The PDF is fetched as soon as the page opens, so that sharing starts at once when the button is tapped.
  const getFile = async () => {
    const res = await fetch(pdfUrl);
    if (!res.ok) throw new Error('Could not make the bill. Try again.');
    return new File([await res.blob()], fileName, { type: 'application/pdf' });
  };
  let file = null;
  getFile().then((f) => (file = f), () => {});

  // Print: the way chosen on this phone (2 inch Bluetooth printer, or a normal printer); the first time it asks.
  ACT.print = () => (printWay.get() ? printBill(o, printWay.get()) : choosePrinter(o));
  ACT.changePrinter = () => choosePrinter(o);
  // WhatsApp takes no file this way, so the message carries a link that opens the bill PDF. The person presses send.
  ACT.waCustomer = () => window.open(wa(o.customer_mobile), '_blank', 'noopener');
  ACT.waBusiness = () => window.open(wa(s.business_whatsapp), '_blank', 'noopener');
  // The PDF itself, through the phone's share list (WhatsApp, email ...).
  ACT.shareBill = async () => {
    file = file || (await getFile());
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: fileName, text: `${S.business} bill ${o.bill_no}` });
      } catch (e) {
        if (e.name !== 'AbortError') throw new Error('Could not open sharing. Press "Open PDF" and send the file.');
      }
      return;
    }
    // A computer has no share list: the PDF is saved instead.
    const a = document.createElement('a');
    a.href = pdfUrl + '?download=1';
    a.download = fileName;
    document.body.append(a);
    a.click();
    a.remove();
    toast('Bill saved in Downloads');
  };
  ACT.deliver = () => deliverSheet(o, refresh);
  ACT.edits = () =>
    sheet(`<h3>Changes of this bill</h3>${o.edits
      .map((e) => `<div class="card"><div class="row"><b>${rs(e.old_total)} → ${rs(e.new_total)}</b><span class="muted small">${fmtAt(e.at)}</span></div><div class="small muted">By ${esc(e.by)}</div></div>`)
      .join('')}`);
  ACT.deleteBill = () =>
    askFirst(`Delete bill ${o.bill_no}?`, `The bill of ${o.customer_name} (${rs(o.total)}) is removed completely with the money received on it, and no longer counts in sales. This cannot be undone. To keep it on record, use "Cancel this bill" instead.`, 'Yes, delete', async () => {
      await api('POST', `/orders/${o.id}/delete`);
      toast('Bill deleted');
      go('#/orders');
    });
  ACT.cancelBill = () => {
    ACT.doCancel = async () => {
      await api('POST', `/orders/${o.id}/cancel`, { reason: $('#x-reason').value });
      toast('Bill cancelled');
      refresh();
    };
    sheet(`<h3>Cancel bill ${esc(o.bill_no)}?</h3>
      <p class="muted">The bill stays saved with its number, marked as cancelled. It no longer counts in sales or in the balance.${o.paid ? ` The ${rs(o.paid)} received stays with the customer as money paid.` : ''}</p>
      <form data-submit="doCancel"><label class="f" for="x-reason">Why?</label><input id="x-reason" required maxlength="200" placeholder="Wrong quantity, wrong customer…">
      <div class="btns"><button class="btn big danger" type="submit">Yes, cancel this bill</button><button class="btn light" type="button" data-act="close">No</button></div></form>`);
  };

  const business = [s.business_address, s.business_phone ? 'Phone: ' + s.business_phone : '', s.business_whatsapp ? 'WhatsApp: ' + s.business_whatsapp : '', s.business_gstin ? 'GSTIN: ' + s.business_gstin : ''].filter(Boolean);
  const state =
    o.status === 'pending'
      ? `<div class="banner warn no-print"><span>${icon('truck', 20)} Not delivered yet</span>${can('deliver') ? '<button class="btn sm" data-act="deliver">Mark delivered</button>' : ''}</div>`
      : o.status === 'delivered'
        ? `<div class="banner ok no-print"><span>✓ Delivered ${o.delivered_date ? dayLabel(o.delivered_date) : ''}${o.delivered_by_name ? ' by ' + esc(o.delivered_by_name) : ''}</span><span>${o.paid ? 'Paid ' + rs(o.paid) : 'Nothing paid'}</span></div>`
        : '';
  return `${query.new ? `<div class="banner ok">✓ Bill ${esc(o.bill_no)} saved</div>` : ''}
    ${state}
    <article class="bill" aria-label="Bill ${esc(o.bill_no)}">
      <div class="bill-head"><b>${esc(S.business)}</b><span>${o.status === 'cancelled' ? 'CANCELLED' : 'BILL'}</span></div>
      <div class="bill-body">
        <div class="bill-meta"><div class="pre muted">${esc(business.join('\n'))}</div>
          <div class="right"><b>${esc(o.bill_no)}</b><div>${fullDate(o.bill_date)}</div><div class="muted">${esc(o.bill_time)}</div></div></div>
        <div class="bill-to"><div class="small red">Bill to</div><b>${esc(o.customer_name)}</b>
          <div class="pre small">${esc([o.customer_mobile ? 'Mobile: ' + o.customer_mobile : '', o.customer_gstin ? 'GSTIN: ' + o.customer_gstin : '', o.customer_address].filter(Boolean).join('\n'))}</div></div>
        <table><thead><tr><th>Product</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr></thead><tbody>
          ${o.items.map((i) => `<tr><td>${esc(i.product_name)} <b>${esc(i.pack_name)}</b></td><td class="num">${i.quantity}</td><td class="num">${rs2(i.rate)}</td><td class="num">${rs2(i.line_total)}</td></tr>`).join('')}
          <tr class="total-row"><td colspan="3">Total</td><td class="num">${rs2(o.total)}</td></tr>
          ${money.map(([label, v, strong]) => `<tr class="${strong ? 'total-row' : 'money-row'}"><td colspan="3">${esc(label)}</td><td class="num">${rs2(v)}</td></tr>`).join('')}
        </tbody></table>
        ${o.status === 'cancelled' ? `<div class="stamp">CANCELLED${o.cancel_reason ? ': ' + esc(o.cancel_reason) : ''}</div>` : ''}
        ${o.note || s.bill_note ? `<p class="small">Note: ${esc(o.note || s.bill_note)}</p>` : ''}
      </div>
      <div class="bill-foot">${esc(s.bill_footer || 'Thank you')}</div>
    </article>
    ${o.edits && o.edits.length ? `<p class="muted small no-print">Changed ${plural(o.edits.length, 'time')}, last by ${esc(o.edits[0].by)} on ${fmtAt(o.edits[0].at)}. <a href="#" data-act="edits">See changes</a></p>` : ''}
    ${canEdit(o) ? `<div class="btns"><a class="btn light" href="#/billedit/${o.id}">${icon('edit', 20)} Edit bill (rates, quantities)</a></div>` : ''}
    <div class="btns"><button class="btn big wa" data-act="waCustomer">${icon('wa', 20)} Send to customer on WhatsApp</button></div>
    <p class="muted small no-print">${o.customer_mobile ? `Opens WhatsApp on ${esc(o.customer_mobile)}` : 'No mobile number for this customer: WhatsApp opens and you choose the chat,'} with the bill written and a link to the PDF. Press send there.</p>
    <div class="btns"><button class="btn big" data-act="print">${icon('print', 20)} Print</button></div>
    <p class="muted small no-print">${printWay.get() ? `Prints on: ${esc(PRINT_WAYS[printWay.get()] || '')}. ` : ''}<a href="#" data-act="changePrinter">${printWay.get() ? 'Change printer' : 'Choose printer'}</a></p>
    <div class="btns">
      <button class="btn light" data-act="shareBill">${icon('share', 20)} Share PDF</button>
      <a class="btn light" href="${pdfUrl}" target="_blank" rel="noopener">${icon('file', 20)} Open PDF</a>
    </div>
    ${s.business_whatsapp ? `<div class="btns"><button class="btn light" data-act="waBusiness">${icon('wa', 20)} Send to business WhatsApp (${esc(s.business_whatsapp)})</button></div>` : ''}
    <div class="btns">
      ${can('orders') ? `<a class="btn light" href="#/order?customer=${o.customer_id}">${icon('plus', 20)} New bill for ${esc(o.customer_name)}</a>` : ''}
      <a class="btn light" href="#/orders">Done</a>
    </div>
    <div class="btns">
      ${can('cancel_orders') && o.status !== 'cancelled' ? '<button class="btn danger sm" data-act="cancelBill">Cancel this bill</button>' : ''}
      ${isOwner() ? '<button class="btn danger sm" data-act="deleteBill">Delete this bill</button>' : ''}
    </div>`;
};

// ---------- changing a bill: rates, quantities, lines added or taken out ----------
VIEWS.billedit = async (parts) => {
  const o = (await api('GET', `/orders/${encodeURIComponent(parts[1] || '')}`)).order;
  if (!canEdit(o)) throw new Error(o.status === 'delivered' ? 'This order is delivered. Only the owner can change it now.' : 'This bill cannot be changed.');
  const { list } = await api('GET', `/products?customer_id=${o.customer_id}`);
  // The lines being changed: the saved ones, then the ones added here.
  const L = o.items.map((i) => ({ variant_id: i.variant_id, name: `${i.product_name} ${i.pack_name}`, quantity: i.quantity, rate: i.rate, was: i.rate }));
  const sync = () =>
    $$('[data-line]').forEach((row) => {
      const l = L[+row.dataset.line];
      l.quantity = $('.el-qty', row).value;
      l.rate = $('.el-rate', row).value;
    });
  const draw = () => {
    let total = 0;
    $('#el-lines').innerHTML =
      L.map((l, i) => {
        const amount = (Number(l.quantity) || 0) * (Number(l.rate) || 0);
        total += amount;
        return `<div class="card" data-line="${i}">
          <div class="row"><b>${esc(l.name)}</b><button type="button" class="btn danger sm" data-act="dropLine" data-i="${i}" aria-label="Take out ${esc(l.name)}">Take out</button></div>
          <div class="two">
            <div><label class="f" for="el-q${i}">Quantity</label><input id="el-q${i}" class="el-qty" type="number" inputmode="numeric" min="1" step="1" value="${esc(l.quantity)}" required data-input="lineChanged"></div>
            <div><label class="f" for="el-r${i}">Rate ₹</label><input id="el-r${i}" class="el-rate" type="number" inputmode="decimal" min="0.01" step="0.01" value="${esc(l.rate)}" required data-input="lineChanged"></div>
          </div>
          <div class="small muted" id="el-a${i}">${l.was != null && Number(l.rate) !== l.was ? `Was ${rs(l.was)} · ` : ''}Amount ${rs(amount)}</div>
        </div>`;
      }).join('') || '<div class="empty">No product left. Add one below.</div>';
    $('#el-total').textContent = rs(total);
  };
  // Typing changes only the amounts, so the box being typed in keeps its place.
  ACT.lineChanged = () => {
    sync();
    let total = 0;
    L.forEach((l, i) => {
      const amount = (Number(l.quantity) || 0) * (Number(l.rate) || 0);
      total += amount;
      $(`#el-a${i}`).textContent = `${l.was != null && Number(l.rate) !== l.was ? `Was ${rs(l.was)} · ` : ''}Amount ${rs(amount)}`;
    });
    $('#el-total').textContent = rs(total);
  };
  ACT.dropLine = (el) => {
    sync();
    L.splice(+el.dataset.i, 1);
    draw();
  };
  ACT.addLine = () => {
    const id = +$('#el-add').value;
    if (!id) return;
    sync();
    if (L.some((l) => l.variant_id === id)) throw new Error('This pack is already on the bill. Change its quantity.');
    for (const p of list) for (const v of p.variants) if (v.id === id) L.push({ variant_id: id, name: `${p.name} ${v.pack_name}`, quantity: 1, rate: v.rate, was: null });
    $('#el-add').value = '';
    draw();
  };
  ACT.ready = draw;
  ACT.save = async () => {
    sync();
    const d = await api('PUT', `/orders/${o.id}`, { items: L.map((l) => ({ variant_id: l.variant_id, quantity: l.quantity, rate: l.rate })), note: $('#el-note').value });
    toast(d.changed ? `Bill changed. New total ${rs(d.total)}` : 'Nothing was changed');
    go(`#/bill/${o.id}`);
  };
  return `<form data-submit="save">
    <h2>Edit bill ${esc(o.bill_no)}</h2>
    <p class="muted">${esc(o.customer_name)} · ${o.status === 'delivered' ? 'already delivered: the balance changes with it' : 'not delivered yet'}</p>
    <div id="el-lines"></div>
    <label class="f" for="el-add">Add a product</label>
    <div class="filters"><select id="el-add"><option value="">Choose…</option>${list
      .map((p) => `<optgroup label="${esc(p.name)}">${p.variants.map((v) => `<option value="${v.id}">${esc(p.name)} ${esc(v.pack_name)} · ${rs(v.rate)}</option>`).join('')}</optgroup>`)
      .join('')}</select><button type="button" class="btn light sm" style="flex:none" data-act="addLine">${icon('plus', 18)} Add</button></div>
    <label class="f" for="el-note">Note on the bill (optional)</label><input id="el-note" maxlength="300" value="${esc(o.note)}">
    <div class="sticky-foot">
      <div class="row"><span class="muted">New total</span><span class="total" id="el-total"></span></div>
      <div class="btns"><button class="btn big" type="submit">Save changes</button><a class="btn light" href="#/bill/${o.id}">Back</a></div>
    </div>
  </form>`;
};
