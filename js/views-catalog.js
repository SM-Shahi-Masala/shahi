'use strict';
// Products (pack sizes, pictures, normal rates), customers and the rates of one customer.

// ---------- pictures ----------
// The phone makes a picture small (longest side 800 px, JPEG) before it is sent, so it uploads fast on mobile data.
function shrinkPicture(fileObj) {
  return new Promise((resolve, reject) => {
    if (!/^image\//.test(fileObj.type)) return reject(new Error('Choose a picture (JPG or PNG)'));
    const url = URL.createObjectURL(fileObj);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 800 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      const g = c.getContext('2d');
      g.fillStyle = '#fff'; // a see-through PNG gets a white background, not black
      g.fillRect(0, 0, c.width, c.height);
      g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This picture cannot be opened. Choose another one.'));
    };
    img.src = url;
  });
}

// "500g" -> 500 g, "1 kg" -> 1 kg, "250 ml" -> 250 ml. Anything else: no weight.
function parsePack(name) {
  const m = /^\s*(\d+(?:\.\d+)?)\s*(g|gm|gms|kg|ml|l|ltr|pcs|pc)?\s*$/i.exec(name);
  if (!m) return { quantity: '', unit: 'g' };
  const u = (m[2] || 'g').toLowerCase();
  return { quantity: Number(m[1]), unit: { gm: 'g', gms: 'g', ltr: 'l', pc: 'pcs' }[u] || u };
}
const SUGGESTED = ['50g', '500g', '1kg'];
const packKey = (name) => String(name).toLowerCase().replace(/\s+/g, '');

const rateHistory = (list) =>
  list.length
    ? `<div class="table-wrap"><table><thead><tr><th>When</th><th>Pack</th><th class="num">From</th><th class="num">To</th><th>By</th></tr></thead><tbody>
      ${list.map((r) => `<tr><td>${fmtAt(r.at)}</td><td class="wrap">${esc(r.product)} ${esc(r.pack_name)}</td><td class="num">${r.old_rate == null ? '–' : rs(r.old_rate)}</td><td class="num">${r.new_rate == null ? 'normal' : rs(r.new_rate)}</td><td>${esc(r.by || '')}</td></tr>`).join('')}
      </tbody></table></div>`
    : '<div class="empty">No rate changes yet.</div>';

// ---------- products list ----------
VIEWS.products = async (parts, query) => {
  const archived = query.show === 'archived';
  const { list } = await cachedGet(archived ? '/products?archived=1' : '/products?all=1');
  ACT.archive = (el) =>
    askFirst('Archive this product?', 'It will not be offered for new bills. Old bills keep showing it. You can bring it back any time.', 'Yes, archive', async () => {
      await api('POST', `/products/${el.dataset.id}/archive`);
      toast('Product archived');
      refresh();
    });
  ACT.restore = async (el) => {
    await api('POST', `/products/${el.dataset.id}/restore`);
    toast('Product is back');
    refresh();
  };
  const card = (p) => {
    const live = p.variants.filter((v) => v.active);
    return `<div class="card" data-item>
      <div class="product">${pic(p, 'big')}<div class="grow">
        <div class="name">${esc(p.name)}</div>
        ${p.description ? `<div class="muted small">${esc(p.description)}</div>` : ''}
        <div class="packs">${live.map((v) => `<span>${esc(v.pack_name)}</span><span class="rate">${rs(v.default_rate)}</span>`).join('')}</div>
      </div></div>
      ${can('products') ? `<div class="btns">${archived ? `<button class="btn light sm" data-act="restore" data-id="${p.id}">Bring back</button>` : `<a class="btn light sm" href="#/product/${p.id}">${icon('edit', 18)} Edit</a><button class="btn danger sm" data-act="archive" data-id="${p.id}">Archive</button>`}</div>` : ''}
    </div>`;
  };
  return `${can('products') ? `<div class="btns"><a class="btn big" href="#/product/new">${icon('plus')} Add product</a></div>` : ''}
    ${can('products') ? `<div class="tabs"><a href="#/products" class="${archived ? '' : 'on'}">Active</a><a href="#/products?show=archived" class="${archived ? 'on' : ''}">Archived</a></div>` : ''}
    ${list.length ? searchBox('Search product or pack size') : ''}
    <div id="quick-list">${list.map(card).join('')}</div>
    ${list.length ? '' : `<div class="empty">${archived ? 'No archived products.' : 'No products yet.'}</div>`}`;
};

// ---------- product form: name, pack sizes, pictures, rates ----------
VIEWS.product = async (parts) => {
  if (!can('products')) throw new Error('You are not allowed to change products.');
  const isNew = parts[1] === 'new' || !parts[1];
  const p = isNew ? null : (await api('GET', `/products/${encodeURIComponent(parts[1])}`)).product;
  const F = {
    name: p ? p.name : '',
    description: p ? p.description : '',
    packs: p ? p.variants.filter((v) => v.active).map((v) => ({ ...v })) : SUGGESTED.map((n) => ({ pack_name: n, ...parsePack(n), default_rate: '' })),
    off: p ? p.variants.filter((v) => !v.active) : [],
    main: p ? { image_id: p.image_id, image_url: p.image_url } : {},
    pending: {}, // new pictures waiting for "Save": 'main' or 'p:<pack name>' -> data: link
    remove: [], // saved pictures to delete on "Save"
  };
  // Everything typed is read back into F before the form is drawn again.
  const sync = () => {
    F.name = $('#pf-name').value;
    F.description = $('#pf-desc').value;
    $$('[data-pack]').forEach((row) => {
      const pk = F.packs[+row.dataset.pack];
      pk.pack_name = $('.pk-name', row).value.trim();
      pk.quantity = $('.pk-qty', row).value;
      pk.unit = $('.pk-unit', row).value;
      pk.default_rate = $('.pk-rate', row).value;
    });
  };
  // saved: the product or pack, with the image_id and image_url of its saved picture.
  const slotPic = (key, saved) => (F.pending[key] ? `<img class="pic" src="${F.pending[key]}" alt="">` : saved.image_id && !F.remove.includes(saved.image_id) ? pic(saved) : noPic());
  const picButtons = (key, saved, savedId = saved.image_id) => `<label class="btn light sm file-btn">${icon('image', 18)} ${F.pending[key] || (savedId && !F.remove.includes(savedId)) ? 'Change' : 'Add picture'}<input type="file" accept="image/*" data-change="pickPic" data-slot="${esc(key)}"></label>
    ${F.pending[key] || (savedId && !F.remove.includes(savedId)) ? `<button class="btn danger sm" type="button" data-act="dropPic" data-slot="${esc(key)}" data-saved="${savedId || ''}">Remove</button>` : ''}`;
  const draw = () => {
    const on = new Set(F.packs.map((x) => packKey(x.pack_name)));
    $('#pf-packs').innerHTML = `
      <div class="chips">${SUGGESTED.map((n) => `<button type="button" class="chip${on.has(packKey(n)) ? ' on' : ''}" data-act="togglePack" data-name="${n}" aria-pressed="${on.has(packKey(n))}">${on.has(packKey(n)) ? '✓ ' : ''}${n}</button>`).join('')}
        <button type="button" class="chip" data-act="addPack">${icon('plus', 16)} Add another size</button></div>
      ${F.packs.length ? '' : '<p class="red small">Choose at least one pack size.</p>'}
      ${F.packs
        .map(
          (pk, i) => `<div class="card" data-pack="${i}">
          <div class="row"><b>Pack ${i + 1}</b><button type="button" class="btn danger sm" data-act="removePack" data-i="${i}" aria-label="Remove pack ${esc(pk.pack_name)}">Remove</button></div>
          <div class="two">
            <div><label class="f" for="pk-n${i}">Pack size name</label><input id="pk-n${i}" class="pk-name" value="${esc(pk.pack_name)}" required maxlength="40" placeholder="500g" data-input="packName" data-i="${i}"></div>
            <div><label class="f" for="pk-r${i}">Normal rate ₹</label><input id="pk-r${i}" class="pk-rate" type="number" inputmode="decimal" step="0.01" min="0.01" value="${esc(pk.default_rate)}" required placeholder="0"></div>
          </div>
          <div class="two">
            <div><label class="f" for="pk-q${i}">Weight</label><input id="pk-q${i}" class="pk-qty" type="number" inputmode="decimal" step="any" min="0" value="${esc(pk.quantity)}"></div>
            <div><label class="f" for="pk-u${i}">Unit</label><select id="pk-u${i}" class="pk-unit">${S.boot.units.map((u) => `<option${u === pk.unit ? ' selected' : ''}>${u}</option>`).join('')}</select></div>
          </div>
          <div class="pic-slot">${slotPic('p:' + packKey(pk.pack_name), pk)}<div class="grow small muted">Picture of this pack (optional)</div></div>
          <div class="btns">${picButtons('p:' + packKey(pk.pack_name), pk)}</div>
        </div>`
        )
        .join('')}
      ${F.off.length ? `<h3>Switched-off pack sizes</h3><div class="chips">${F.off.map((v, i) => `<button type="button" class="chip" data-act="bringPack" data-i="${i}">${icon('plus', 16)} ${esc(v.pack_name)} (${rs(v.default_rate)})</button>`).join('')}</div><p class="muted small">Old bills keep them. Tap one to sell it again.</p>` : ''}`;
    $('#pf-main').innerHTML = `<div class="pic-slot">${slotPic('main', F.main)}<div class="grow small muted">Main picture, shown on the product and when making a bill</div></div><div class="btns">${picButtons('main', F.main)}</div>`;
  };
  const redraw = () => {
    sync();
    draw();
  };

  ACT.ready = draw;
  // Typing the pack name fills in the weight: "250g" -> 250 g.
  ACT.packName = (el) => {
    const row = el.closest('[data-pack]');
    const guess = parsePack(el.value);
    if (guess.quantity !== '') {
      $('.pk-qty', row).value = guess.quantity;
      $('.pk-unit', row).value = guess.unit;
    }
  };
  ACT.togglePack = (el) => {
    sync();
    const i = F.packs.findIndex((x) => packKey(x.pack_name) === packKey(el.dataset.name));
    if (i >= 0) F.packs.splice(i, 1);
    else {
      const old = F.off.findIndex((v) => packKey(v.pack_name) === packKey(el.dataset.name));
      F.packs.push(old >= 0 ? { ...F.off.splice(old, 1)[0], active: true } : { pack_name: el.dataset.name, ...parsePack(el.dataset.name), default_rate: '' });
    }
    draw();
  };
  ACT.removePack = (el) => {
    sync();
    const [gone] = F.packs.splice(+el.dataset.i, 1);
    if (gone.id) F.off.push(gone);
    draw();
  };
  ACT.bringPack = (el) => {
    sync();
    F.packs.push({ ...F.off.splice(+el.dataset.i, 1)[0], active: true });
    draw();
  };
  ACT.addPack = () => {
    sync();
    ACT.saveNewPack = () => {
      const name = $('#np-name').value.trim();
      if (!name) throw new Error('Write the pack size, like 250g');
      if (F.packs.some((x) => packKey(x.pack_name) === packKey(name))) throw new Error('This pack size is already there');
      const old = F.off.findIndex((v) => packKey(v.pack_name) === packKey(name));
      F.packs.push(old >= 0 ? { ...F.off.splice(old, 1)[0], active: true, default_rate: $('#np-rate').value || F.off[old]?.default_rate } : { pack_name: name, quantity: $('#np-qty').value, unit: $('#np-unit').value, default_rate: $('#np-rate').value });
      closeSheet();
      draw();
    };
    ACT.npGuess = (el) => {
      const g = parsePack(el.value);
      if (g.quantity !== '') ($('#np-qty').value = g.quantity), ($('#np-unit').value = g.unit);
    };
    sheet(`<h3>Add another pack size</h3>
      <form data-submit="saveNewPack">
        <label class="f" for="np-name">Pack size name</label><input id="np-name" required maxlength="40" placeholder="250g, 100g, 2kg, 10 pcs…" data-input="npGuess">
        <div class="two"><div><label class="f" for="np-qty">Weight</label><input id="np-qty" type="number" inputmode="decimal" step="any" min="0"></div>
        <div><label class="f" for="np-unit">Unit</label><select id="np-unit">${S.boot.units.map((u) => `<option>${u}</option>`).join('')}</select></div></div>
        <label class="f" for="np-rate">Normal rate ₹</label><input id="np-rate" type="number" inputmode="decimal" step="0.01" min="0.01">
        <div class="btns"><button class="btn big" type="submit">Add</button></div>
      </form>`);
  };
  ACT.pickPic = async (el) => {
    const f = el.files && el.files[0];
    if (!f) return;
    sync();
    F.pending[el.dataset.slot] = await shrinkPicture(f);
    draw();
  };
  ACT.dropPic = (el) => {
    sync();
    if (F.pending[el.dataset.slot]) delete F.pending[el.dataset.slot];
    else if (el.dataset.saved) F.remove.push(+el.dataset.saved);
    draw();
  };
  ACT.save = async () => {
    sync();
    if (!F.packs.length) throw new Error('Choose at least one pack size');
    const body = {
      name: F.name,
      description: F.description,
      variants: F.packs.map((x) => ({ id: x.id, pack_name: x.pack_name, quantity: x.quantity, unit: x.unit, default_rate: x.default_rate, active: true })),
    };
    const saved = (await api(isNew ? 'POST' : 'PUT', isNew ? '/products' : `/products/${p.id}`, body)).product;
    // Pictures go after the product is saved, because a new pack gets its id only then.
    let failed = '';
    for (const id of F.remove) await api('POST', `/images/${id}/delete`).catch((e) => (failed = e.message));
    for (const [slot, data] of Object.entries(F.pending)) {
      const v = slot === 'main' ? null : saved.variants.find((x) => x.active && 'p:' + packKey(x.pack_name) === slot);
      if (slot !== 'main' && !v) continue; // the pack was removed or renamed after its picture was chosen
      await api('POST', `/products/${saved.id}/images`, { data, variant_id: v ? v.id : null }).catch((e) => (failed = e.message));
    }
    toast(failed ? `Product saved, but a picture was not saved: ${failed}` : 'Product saved', !!failed);
    go('#/products');
  };
  ACT.archive = () =>
    askFirst('Archive this product?', 'It will not be offered for new bills. Old bills keep showing it.', 'Yes, archive', async () => {
      await api('POST', `/products/${p.id}/archive`);
      toast('Product archived');
      go('#/products');
    });
  ACT.history = async () => sheet(`<h3>Rate changes</h3>${rateHistory((await api('GET', `/rate-changes?product_id=${p.id}`)).list)}`);

  return `<form data-submit="save">
    <h2>${isNew ? 'New product' : 'Change product'}</h2>
    ${p && p.archived_at ? '<div class="banner bad">This product is archived. Bring it back from the Archived list first.</div>' : ''}
    <h3>1. Product name</h3>
    <label class="f" for="pf-name">Product name</label>
    <input id="pf-name" value="${esc(F.name)}" required maxlength="120" placeholder="SHAHI Green Chicken Masala">
    <label class="f" for="pf-desc">Description (optional)</label>
    <textarea id="pf-desc" maxlength="500">${esc(F.description)}</textarea>
    <h3>2. Pack sizes and normal rates</h3>
    <p class="muted small">Tap the sizes you sell. The normal rate is used for every customer who has no own rate.</p>
    <div id="pf-packs"></div>
    <h3>3. Pictures</h3>
    <div class="card" id="pf-main"></div>
    <p class="muted small">Pictures of each pack are in the pack boxes above.</p>
    <div class="sticky-foot"><button class="btn big" type="submit">${isNew ? 'Save and activate' : 'Save changes'}</button></div>
    ${p && !p.archived_at ? `<div class="btns"><button type="button" class="btn light sm" data-act="history">Rate changes</button><button type="button" class="btn danger sm" data-act="archive">Archive product</button></div>` : ''}
  </form>`;
};

// ---------- customers ----------
VIEWS.customers = async (parts, query) => {
  const archived = query.show === 'archived';
  const { list } = await cachedGet('/customers' + (archived ? '?archived=1' : ''));
  ACT.ready = () => {
    if (query.q) {
      $('#quick-q').value = query.q;
      quickApply();
    }
  };
  return `${can('customers') || can('orders') ? `<div class="btns"><a class="btn big" href="#/customerform">${icon('plus')} New customer</a></div>` : ''}
    ${can('customers') ? `<div class="tabs"><a href="#/customers" class="${archived ? '' : 'on'}">Active</a><a href="#/customers?show=archived" class="${archived ? 'on' : ''}">Archived</a></div>` : ''}
    ${searchBox('Search: name, mobile, address')}
    <div id="quick-list">${list
      .map(
        (c) => `<a class="card" href="#/customer/${c.id}" data-item>
        <div class="row"><b>${esc(c.name)}</b>${c.own_rates ? `<span class="tag own">${plural(c.own_rates, 'own rate')}</span>` : ''}</div>
        <div class="muted small">${dots(esc(c.mobile), esc(c.address))}</div>
        ${c.last_order ? `<div class="small muted">Last bill: ${dayLabel(c.last_order)}</div>` : ''}
      </a>`
      )
      .join('')}</div>
    ${list.length ? '' : `<div class="empty">${archived ? 'No archived customers.' : 'No customers yet.'}</div>`}`;
};

VIEWS.customer = async (parts) => {
  const d = await cachedGet(`/customers/${encodeURIComponent(parts[1] || '')}`);
  const c = d.customer;
  ACT.archive = () =>
    askFirst(`Archive ${c.name}?`, 'The customer will not be offered for new bills. Old bills stay. You can bring it back any time.', 'Yes, archive', async () => {
      await api('POST', `/customers/${c.id}/archive`);
      toast('Customer archived');
      go('#/customers');
    });
  ACT.restore = async () => {
    await api('POST', `/customers/${c.id}/restore`);
    toast('Customer is back');
    refresh();
  };
  const details = [
    c.gstin ? ['GSTIN', esc(c.gstin)] : null,
    c.email ? ['Email', `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`] : null,
    c.credit_limit ? ['Credit limit', rs(c.credit_limit)] : null,
    c.payment_terms_days ? ['Payment within', plural(c.payment_terms_days, 'day')] : null,
  ].filter(Boolean);
  const rateRows = d.products
    .map((p) =>
      p.variants
        .map((v) => `<tr><td class="wrap">${esc(p.name)}</td><td>${esc(v.pack_name)}</td><td class="num">${rs(v.default_rate)}</td><td class="num">${v.customer_rate != null ? `<b>${rs(v.customer_rate)}</b>` : '<span class="muted">normal</span>'}</td></tr>`)
        .join('')
    )
    .join('');
  return `${c.active ? '' : '<div class="banner bad">This customer is archived.</div>'}
    <h2>${esc(c.name)}</h2>
    ${c.address ? `<p class="pre">${esc(c.address)}</p>` : ''}
    ${details.length ? `<div class="card"><ul class="items">${details.map(([k, v]) => `<li><span class="muted">${k}</span><span>${v}</span></li>`).join('')}</ul></div>` : ''}
    ${c.active && can('orders') ? `<div class="btns"><a class="btn big" href="#/order?customer=${c.id}">${icon('plus')} New bill</a></div>` : ''}
    <div class="btns">
      ${c.mobile ? tel(c.mobile, 'btn light') + `<a class="btn light" href="https://wa.me/91${esc(c.mobile)}" target="_blank" rel="noopener">${icon('wa', 18)} WhatsApp</a>` : ''}
      ${can('customers') ? `<a class="btn light" href="#/customerform/${c.id}">${icon('edit', 18)} Edit</a>` : ''}
    </div>
    <div class="tiles"><div class="tile"><b>${num(d.sums.n)}</b><span>Bills</span></div><div class="tile"><b>${rs(d.sums.total)}</b><span>Total bought</span></div></div>
    <h3>Rates for ${esc(c.name)}</h3>
    ${rateRows ? `<div class="table-wrap"><table><thead><tr><th>Product</th><th>Pack</th><th class="num">Normal</th><th class="num">This customer</th></tr></thead><tbody>${rateRows}</tbody></table></div>` : '<div class="empty">No products yet.</div>'}
    ${can('customer_rates') && rateRows ? `<div class="btns"><a class="btn light" href="#/rates/${c.id}">${icon('tag', 18)} Change rates</a></div>` : ''}
    <h3>Bills</h3>
    ${d.orders.map(orderCard).join('') || '<div class="empty">No bills yet.</div>'}
    ${can('customers') ? `<div class="btns">${c.active ? '<button class="btn danger sm" data-act="archive">Archive customer</button>' : '<button class="btn light sm" data-act="restore">Bring customer back</button>'}</div>` : ''}`;
};

VIEWS.customerform = async (parts) => {
  const c = parts[1] ? (await api('GET', `/customers/${encodeURIComponent(parts[1])}`)).customer : null;
  if (c && !can('customers')) throw new Error('You are not allowed to change customers.');
  const field = (id, label, value, extra = '') => `<label class="f" for="cf-${id}">${label}</label><input id="cf-${id}" value="${esc(value ?? '')}" ${extra}>`;
  const read = (force) => ({
    name: $('#cf-name').value,
    mobile: $('#cf-mobile').value,
    address: $('#cf-address').value,
    email: $('#cf-email').value,
    gstin: $('#cf-gstin').value,
    credit_limit: $('#cf-credit').value,
    payment_terms_days: $('#cf-days').value,
    force,
  });
  const saveNew = async (force) => {
    const d = await api('POST', '/customers', read(force));
    CUSTOMERS_CACHE = null;
    if (d.exists) {
      // Same name and mobile number: probably already saved.
      ACT.forceAdd = () => saveNew(true);
      sheet(`<h3>Already saved?</h3><p>A customer with this name and mobile number is already there:</p>
        <div class="card"><b>${esc(d.exists.name)}</b><div class="muted small">${dots(esc(d.exists.mobile), esc(d.exists.address))}</div></div>
        <div class="btns"><a class="btn big" href="#/customer/${d.exists.id}">Open the saved customer</a><button class="btn light" data-act="forceAdd">This is different – add it</button></div>`);
      return;
    }
    toast('Customer saved');
    go(`#/customer/${d.customer.id}`);
  };
  ACT.save = async () => {
    if (!c) return saveNew(false);
    await api('PUT', `/customers/${c.id}`, read());
    CUSTOMERS_CACHE = null;
    toast('Saved');
    go(`#/customer/${c.id}`);
  };
  return `<form data-submit="save">
    <h2>${c ? 'Change customer' : 'New customer'}</h2>
    ${field('name', 'Name (shop, hotel or person)', c?.name, 'required maxlength="120"')}
    ${field('mobile', 'Mobile number (for WhatsApp)', c?.mobile, 'type="tel" inputmode="numeric" maxlength="10" data-input="digits" placeholder="10 digits"')}
    <label class="f" for="cf-address">Address</label><textarea id="cf-address" maxlength="400">${esc(c?.address)}</textarea>
    <details ${c && (c.email || c.gstin || c.credit_limit || c.payment_terms_days) ? 'open' : ''}><summary class="f" style="cursor:pointer;padding:12px 0;font-weight:600">More details (optional)</summary>
      ${field('email', 'Email', c?.email, 'type="email" maxlength="120"')}
      ${field('gstin', 'GSTIN', c?.gstin, 'maxlength="15" style="text-transform:uppercase"')}
      <div class="two">${field('credit', 'Credit limit ₹', c?.credit_limit || '', 'type="number" inputmode="decimal" min="0" step="0.01"')}
      ${field('days', 'Payment within (days)', c?.payment_terms_days || '', 'type="number" inputmode="numeric" min="0" max="365"')}</div>
    </details>
    <div class="btns"><button class="btn big" type="submit">Save</button></div>
  </form>`;
};

// ---------- the rates of one customer ----------
VIEWS.rates = async (parts) => {
  if (!can('customer_rates')) throw new Error('You are not allowed to change rates.');
  const d = await api('GET', `/customers/${encodeURIComponent(parts[1] || '')}`);
  const c = d.customer;
  ACT.save = async () => {
    const rates = $$('[data-rate]').map((el) => ({ variant_id: +el.dataset.rate, rate: el.value.trim() }));
    await api('PUT', `/customers/${c.id}/rates`, { rates });
    toast('Rates saved. New bills use them; old bills keep their rates.');
    go(`#/customer/${c.id}`);
  };
  ACT.clear = (el) => {
    $(`#r-${el.dataset.v}`).value = '';
  };
  ACT.history = async () => sheet(`<h3>Rate changes for ${esc(c.name)}</h3>${rateHistory((await api('GET', `/rate-changes?customer_id=${c.id}`)).list)}`);
  return `<form data-submit="save">
    <h2>${esc(c.name)}</h2>
    <p class="muted">Type the rate this customer pays. Leave it empty to use the normal rate. Old bills never change.</p>
    ${d.products
      .map(
        (p) => `<div class="card"><div class="product">${pic(p)}<div class="grow"><div class="name">${esc(p.name)}</div></div></div>
        ${p.variants
          .map(
            (v) => `<div class="pick"><div class="grow"><span class="pack">${esc(v.pack_name)}</span><div class="small muted">Normal ${rs(v.default_rate)}</div></div>
            <input id="r-${v.id}" style="max-width:120px" type="number" inputmode="decimal" step="0.01" min="0.01" data-rate="${v.id}" value="${v.customer_rate ?? ''}" placeholder="${v.default_rate}" aria-label="Rate of ${esc(p.name)} ${esc(v.pack_name)} for ${esc(c.name)}">
            <button type="button" class="btn light sm" data-act="clear" data-v="${v.id}" aria-label="Use normal rate">Normal</button></div>`
          )
          .join('')}</div>`
      )
      .join('') || '<div class="empty">No products yet.</div>'}
    <div class="sticky-foot"><button class="btn big" type="submit">Save rates</button></div>
    <div class="btns"><button type="button" class="btn light sm" data-act="history">Rate changes</button></div>
  </form>`;
};
