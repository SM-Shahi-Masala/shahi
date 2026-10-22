'use strict';
// Home, orders, the new bill and the bill page.

// One small card per order, used on Home, Orders and the customer page.
const orderCard = (o) => `<a class="card" href="#/bill/${o.id}" data-item>
  <div class="row"><b>${esc(o.customer_name)}</b><b>${rs(o.total)}</b></div>
  <div class="row muted small"><span>${dots(esc(o.bill_no), dayLabel(o.bill_date), plural(o.lines, 'item'))}</span>${o.status === 'cancelled' ? '<span class="tag cancelled">Cancelled</span>' : ''}</div>
  ${o.items ? `<div class="small muted">${o.items.map((i) => `${esc(i.product_name)} ${esc(i.pack_name)} × ${i.quantity}`).join(', ')}</div>` : ''}
  ${can('all_orders') ? `<div class="small muted">By ${esc(o.created_by_name)}</div>` : ''}
</a>`;

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
    <div class="tiles">
      <div class="tile"><b>${num(d.day.n)}</b><span>Bills today</span></div>
      <div class="tile"><b>${rs(d.day.total)}</b><span>Sales today</span></div>
      <div class="tile"><b>${num(d.month.n)}</b><span>Bills this month</span></div>
      <div class="tile"><b>${rs(d.month.total)}</b><span>Sales this month</span></div>
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
  const active = list.filter((o) => o.status === 'active');
  return `${can('orders') ? `<div class="btns"><a class="btn big" href="#/order">${icon('plus')} New bill</a></div>` : ''}
    <div class="chips">${PERIODS.map(([v, l]) => `<button class="chip${ORDER_FILTER.period === v ? ' on' : ''}" data-act="period" data-val="${v}">${l}</button>`).join('')}</div>
    <div class="chips">${[['', 'All bills'], ['active', 'Not cancelled'], ['cancelled', 'Cancelled']].map(([v, l]) => `<button class="chip${ORDER_FILTER.status === v ? ' on' : ''}" data-act="status" data-val="${v}">${l}</button>`).join('')}</div>
    <div class="banner ok"><span>${plural(active.length, 'bill')}</span><span>${rs(active.reduce((s, o) => s + o.total, 0))}</span></div>
    ${searchBox('Search: customer, bill no, product, amount')}
    <div id="quick-list">${list.map(orderCard).join('')}</div>
    ${list.length ? '' : '<div class="empty">No bills in this period.</div>'}
    ${list.length >= 300 ? '<p class="muted small">Only the last 300 bills are shown. Choose a shorter period.</p>' : ''}`;
};

// ---------- new bill ----------
// The bill being made stays here while the person moves around the app, until it is saved.
const DRAFT = { customer: null, qty: {}, note: '' };
function resetDraft() {
  Object.assign(DRAFT, { customer: null, qty: {}, note: '' });
}
let CUSTOMERS_CACHE = null;

// Adding a customer quickly without leaving the bill: name, mobile, address.
function quickCustomerSheet(name, onSaved) {
  ACT.saveQuickCustomer = async () => {
    const body = { name: $('#qc-name').value, mobile: $('#qc-mobile').value, address: $('#qc-address').value };
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
        hits.map((c) => `<button data-act="pickCustomer" data-id="${c.id}"><b>${esc(c.name)}</b><div class="muted small">${dots(esc(c.mobile), esc(c.address))}</div></button>`).join('') +
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

  return `<div class="chosen"><div class="grow"><b>${esc(c.name)}</b><div class="muted small">${dots(esc(c.mobile), esc(c.address))}</div></div>
      <button class="btn light sm" data-act="changeCustomer">Change</button></div>
    ${list.length ? searchBox('Search product or pack size') : ''}
    <div id="quick-list">${products}</div>
    ${list.length ? '' : `<div class="empty">No products to sell yet.${can('products') ? '<div class="btns"><a class="btn" href="#/product/new">Add a product</a></div>' : ' Ask the owner to add products.'}</div>`}
    <label class="f" for="o-note">Note on the bill (optional)</label>
    <input id="o-note" maxlength="300" value="${esc(DRAFT.note)}" data-input="note" placeholder="${esc(S.boot.settings.bill_note || '')}">
    <div class="sticky-foot">
      <div class="row"><span class="muted" id="o-count"></span><span class="total" id="o-total"></span></div>
      <div class="btns"><button class="btn big" data-act="createBill">Create bill</button></div>
    </div>`;
};

// ---------- the bill ----------
VIEWS.bill = async (parts, query) => {
  const o = (await cachedGet(`/orders/${encodeURIComponent(parts[1] || '')}`)).order;
  const s = S.boot.settings;
  const fileName = `Bill-${o.bill_no}.pdf`;
  // The bill link: works without login, but only with the long random code of this bill.
  const pdfUrl = `${API_URL}/bill/${o.bill_token}`;
  const message = [
    `*${S.business}*`,
    `Bill ${o.bill_no} · ${fullDate(o.bill_date)}`,
    `Customer: ${o.customer_name}`,
    '',
    ...o.items.map((i) => `${i.product_name} ${i.pack_name} × ${i.quantity} @ ${rs(i.rate)} = ${rs(i.line_total)}`),
    '',
    `*Total: ${rs2(o.total)}*`,
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

  ACT.print = () => window.print();
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
  ACT.cancelBill = () => {
    ACT.doCancel = async () => {
      await api('POST', `/orders/${o.id}/cancel`, { reason: $('#x-reason').value });
      toast('Bill cancelled');
      refresh();
    };
    sheet(`<h3>Cancel bill ${esc(o.bill_no)}?</h3>
      <p class="muted">The bill stays saved with its number, marked as cancelled. It no longer counts in sales.</p>
      <form data-submit="doCancel"><label class="f" for="x-reason">Why?</label><input id="x-reason" required maxlength="200" placeholder="Wrong quantity, wrong customer…">
      <div class="btns"><button class="btn big danger" type="submit">Yes, cancel this bill</button><button class="btn light" type="button" data-act="close">No</button></div></form>`);
  };

  const business = [s.business_address, s.business_phone ? 'Phone: ' + s.business_phone : '', s.business_whatsapp ? 'WhatsApp: ' + s.business_whatsapp : '', s.business_gstin ? 'GSTIN: ' + s.business_gstin : ''].filter(Boolean);
  return `${query.new ? `<div class="banner ok">✓ Bill ${esc(o.bill_no)} saved</div>` : ''}
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
        </tbody></table>
        ${o.status === 'cancelled' ? `<div class="stamp">CANCELLED${o.cancel_reason ? ': ' + esc(o.cancel_reason) : ''}</div>` : ''}
        ${o.note || s.bill_note ? `<p class="small">Note: ${esc(o.note || s.bill_note)}</p>` : ''}
      </div>
      <div class="bill-foot">${esc(s.bill_footer || 'Thank you')}</div>
    </article>
    <div class="btns"><button class="btn big wa" data-act="waCustomer">${icon('wa', 20)} Send to customer on WhatsApp</button></div>
    <p class="muted small no-print">${o.customer_mobile ? `Opens WhatsApp on ${esc(o.customer_mobile)}` : 'No mobile number for this customer: WhatsApp opens and you choose the chat,'} with the bill written and a link to the PDF. Press send there.</p>
    <div class="btns">
      <button class="btn light" data-act="print">${icon('print', 20)} Print</button>
      <button class="btn light" data-act="shareBill">${icon('share', 20)} Share PDF</button>
      <a class="btn light" href="${pdfUrl}" target="_blank" rel="noopener">${icon('file', 20)} Open PDF</a>
    </div>
    ${s.business_whatsapp ? `<div class="btns"><button class="btn light" data-act="waBusiness">${icon('wa', 20)} Send to business WhatsApp (${esc(s.business_whatsapp)})</button></div>` : ''}
    <div class="btns">
      ${can('orders') ? `<a class="btn light" href="#/order?customer=${o.customer_id}">${icon('plus', 20)} New bill for ${esc(o.customer_name)}</a>` : ''}
      <a class="btn light" href="#/orders">Done</a>
    </div>
    ${can('cancel_orders') && o.status === 'active' ? `<div class="btns"><button class="btn danger sm" data-act="cancelBill">Cancel this bill</button></div>` : ''}`;
};
