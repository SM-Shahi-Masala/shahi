/* SHAHI — Products View (Native App Style) */

function renderViewProducts(params = {}) {
  if (params.newProduct || params.productId) return renderProductForm();
  return renderProductsList();
}

function renderProductsList() {
  return `
    <section class="view-content" style="padding: var(--space-4);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
        <h2 style="font-size: var(--text-xl); font-weight: var(--font-bold); margin: 0;">Products</h2>
        <button class="btn btn--primary" onclick="location.hash='#products/new'" data-role-manager>
          <svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Product
        </button>
      </div>

      <div class="card" style="margin-bottom: var(--space-4);">
        <div class="card__body" style="padding: var(--space-4);">
          <div class="search-box">
            <input type="search" id="products-search" class="form-input" placeholder="Search products...">
          </div>
        </div>
      </div>

      <div id="products-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-3);">
        <!-- Populated by JS -->
      </div>
    </section>
  `;
}

function renderProductForm() {
  return `
    <section class="view-content" style="padding: var(--space-4);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4);">
        <h2 style="font-size: var(--text-xl); font-weight: var(--font-bold); margin: 0;">Product Details</h2>
      </div>

      <form id="product-form">
        <!-- Step 1: Name -->
        <div class="card" style="margin-bottom: var(--space-4);">
          <div class="card__header">
            <h3 class="card__title">Product Name</h3>
          </div>
          <div class="card__body" style="padding: var(--space-4);">
            <div class="form-group">
              <label class="form-label" for="product-name">Name <span style="color: var(--color-error);">*</span></label>
              <input type="text" id="product-name" class="form-input" required placeholder="e.g., SHAHI Green Chicken Masala">
            </div>
            <div class="form-group">
              <label class="form-label" for="product-description">Description</label>
              <textarea id="product-description" class="form-textarea" rows="2" placeholder="Optional description"></textarea>
            </div>
          </div>
        </div>

        <!-- Step 2: Pack Sizes -->
        <div class="card" style="margin-bottom: var(--space-4);" id="product-packs-section" data-role-manager>
          <div class="card__header">
            <h3 class="card__title">Pack Sizes</h3>
          </div>
          <div class="card__body" style="padding: var(--space-4);">
            <p style="font-size: var(--text-sm); color: var(--text-tertiary); margin-bottom: var(--space-3);">
              Suggested: 50g • 500g • 1kg
            </p>
            <div style="display: flex; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-3);" id="suggested-packs">
              <!-- Populated by JS -->
            </div>
            <div id="custom-packs-container"></div>
            <button type="button" class="btn btn--outline btn--full" id="btn-add-custom-pack">
              <svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Custom Size
            </button>
          </div>
        </div>

        <!-- Step 3: Images -->
        <div class="card" style="margin-bottom: var(--space-4);" id="product-images-section" data-role-manager>
          <div class="card__header">
            <h3 class="card__title">Product Image</h3>
          </div>
          <div class="card__body" style="padding: var(--space-4);">
            <div class="form-group">
              <label class="form-label">Main Image</label>
              <div id="main-image-preview" style="width: 100px; height: 100px; border-radius: var(--radius-lg); background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center; overflow: hidden; margin-bottom: var(--space-3);">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
              </div>
              <input type="file" id="main-image-input" accept="image/*" class="form-input" style="display: none;" onchange="handleMainImageUpload(this)">
              <button type="button" class="btn btn--outline" onclick="document.getElementById('main-image-input').click()">
                Upload Image
              </button>
            </div>
          </div>
        </div>

        <!-- Step 4: Rates -->
        <div class="card" style="margin-bottom: var(--space-4);" id="product-rates-section" data-role-manager>
          <div class="card__header">
            <h3 class="card__title">Default Rates</h3>
          </div>
          <div class="card__body" style="padding: var(--space-4);" id="product-rates-list">
            <!-- Populated by JS -->
          </div>
        </div>

        <div style="display: flex; gap: var(--space-3);">
          <button type="button" class="btn btn--outline btn--full" onclick="location.hash='#products'">Cancel</button>
          <button type="submit" class="btn btn--primary btn--full btn--lg" data-role-manager>Save Product</button>
        </div>
      </form>
    </section>
  `;
}

async function initViewProducts(params = {}) {
  await loadProductsCache();

  const container = $('#view-container');
  const existing = container.querySelector('.view.active');
  if (existing) existing.remove();

  const viewEl = document.createElement('div');
  viewEl.className = 'view active';
  viewEl.id = 'view-products';
  viewEl.innerHTML = renderViewProducts(params);
  container.appendChild(viewEl);

  initSuggestedPacks();
  setupProductForm();

  if (params.newProduct) {
    // nothing else
  } else if (params.productId) {
    await loadProductDetail(params.productId);
  } else {
    renderProductsGridUI();
  }
}

// ============================================
// LIST / GRID
// ============================================
function renderProductsGridUI() {
  const container = $('#products-grid');
  if (!container) return;

  const list = (window.productsCache || []).filter(p => p.active);
  if (!list.length) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1; padding: 48px 16px;">
        <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
        <div class="empty-state__title">No products yet</div>
        <p class="empty-state__text">Add your first product to start selling</p>
        <button class="btn btn--primary" onclick="location.hash='#products/new'" data-role-manager>Add Product</button>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(product => `
    <article class="card product-card" onclick="location.hash='#products/${product.id}'">
      <div class="product-card__image" style="width: 100%; aspect-ratio: 1; object-fit: cover; background: var(--bg-tertiary); overflow: hidden;">
        ${product.mainImage 
          ? `<img src="${product.mainImage}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;">`
          : '<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--text-tertiary);"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg></div>'
        }
      </div>
      <div class="product-card__info" style="padding: var(--space-3);">
        <h3 class="product-card__name" style="font-size: var(--text-base); font-weight: var(--font-semibold); margin: 0 0 var(--space-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${product.name}</h3>
        <div class="product-card__variants" style="display: flex; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-3);">
          ${(product.variants || []).filter(v => v.active).map(v => `
            <span class="variant-chip">${v.pack_name} • ${formatCurrency(v.default_rate)}</span>
          `).join('')}
        </div>
        <div class="product-card__actions" style="display: flex; gap: var(--space-2); padding-top: var(--space-3); border-top: 1px solid var(--border-light);">
          <button class="btn btn--outline btn--sm" onclick="event.stopPropagation(); location.hash='#products/${product.id}'">View</button>
          ${can('manage_products') ? `<button class="btn btn--outline btn--sm" onclick="event.stopPropagation(); editProduct('${product.id}')">Edit</button>` : ''}
          ${can('manage_products') ? `<button class="btn btn--ghost btn--sm btn--danger" onclick="event.stopPropagation(); archiveProduct('${product.id}')">Archive</button>` : ''}
        </div>
      </div>
    </article>
  `).join('');

  const searchInput = $('#products-search');
  if (searchInput) {
    searchInput.addEventListener('input', SHAHI.debounce(() => {
      const term = searchInput.value.toLowerCase();
      $$('.product-card', container).forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(term) ? 'block' : 'none';
      });
    }, 200));
  }
}

// ============================================
// FORM
// ============================================
function initSuggestedPacks() {
  const container = $('#suggested-packs');
  if (!container) return;

  const suggested = [
    { pack_name: '50g', quantity: 50, unit: 'g' },
    { pack_name: '500g', quantity: 500, unit: 'g' },
    { pack_name: '1kg', quantity: 1, unit: 'kg' }
  ];

  container.innerHTML = suggested.map(pack => `
    <label class="form-checkbox" style="flex: 1; min-width: 100px; padding: var(--space-3); background: var(--bg-tertiary); border-radius: var(--radius-md); border: 1px solid var(--border-light); cursor: pointer; text-align: center;">
      <input type="checkbox" name="suggested-pack" value="${pack.pack_name}" data-quantity="${pack.quantity}" data-unit="${pack.unit}" checked style="margin: 0;">
      <span style="font-weight: var(--font-medium); display: block; margin-top: var(--space-1);">${pack.pack_name}</span>
    </label>
  `).join('');
}

function setupProductForm() {
  $('#btn-add-custom-pack')?.addEventListener('click', () => addCustomPackRow());

  const mainImageInput = $('#main-image-input');
  const mainImagePreview = $('#main-image-preview');
  if (mainImageInput && mainImagePreview) {
    mainImageInput.addEventListener('change', (e) => handleMainImageUpload(e.target));
    mainImagePreview.addEventListener('click', () => mainImageInput.click());
    mainImagePreview.style.cursor = 'pointer';
  }

  $('#product-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveProduct();
  });

  $('#btn-archive-product')?.addEventListener('click', () => {
    if (window.currentProductId) archiveProduct(window.currentProductId);
  });

  $('#btn-edit-product')?.addEventListener('click', () => {
    if (window.currentProductId) editProduct(window.currentProductId);
  });
}

function addCustomPackRow(pack = {}) {
  const container = $('#custom-packs-container');
  if (!container) return;

  const rowId = SHAHI.generateId().slice(0, 8);
  const row = document.createElement('div');
  row.className = 'custom-pack-row';
  row.dataset.rowId = rowId;
  row.style.cssText = 'display: flex; gap: var(--space-2); align-items: flex-end; margin-bottom: var(--space-2); flex-wrap: wrap;';
  row.innerHTML = `
    <div style="flex: 1; min-width: 110px;">
      <label class="form-label" style="font-size: var(--text-xs);">Pack Name</label>
      <input type="text" class="form-input custom-pack-name" placeholder="e.g. 250g" value="${pack.pack_name || ''}" required>
    </div>
    <div style="flex: 1; min-width: 80px;">
      <label class="form-label" style="font-size: var(--text-xs);">Qty</label>
      <input type="number" class="form-input custom-pack-qty" step="0.001" min="0.001" value="${pack.quantity || ''}" required>
    </div>
    <div style="flex: 1; min-width: 80px;">
      <label class="form-label" style="font-size: var(--text-xs);">Unit</label>
      <select class="form-select custom-pack-unit">
        <option value="g" ${pack.unit === 'g' ? 'selected' : ''}>g</option>
        <option value="kg" ${pack.unit === 'kg' ? 'selected' : ''}>kg</option>
        <option value="pcs" ${pack.unit === 'pcs' ? 'selected' : ''}>pcs</option>
        <option value="ml" ${pack.unit === 'ml' ? 'selected' : ''}>ml</option>
      </select>
    </div>
    <button type="button" class="btn btn--ghost btn--sm" style="align-self: flex-end; margin-bottom: 1.5rem;" onclick="removeCustomPackRow('${rowId}')" aria-label="Remove">
      <svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;
  container.appendChild(row);
}

window.removeCustomPackRow = function(rowId) {
  const row = $(`.custom-pack-row[data-row-id="${rowId}"]`);
  if (row) row.remove();
};

function handleMainImageUpload(input) {
  const file = input.files?.[0];
  if (!file) return;
  const validation = SHAHI.ImageUtils.validate(file);
  if (!validation.valid) {
    window.toast?.error(validation.error);
    input.value = '';
    return;
  }
  SHAHI.ImageUtils.compress(file, 800, 800, 0.85).then(blob => {
    const url = URL.createObjectURL(blob);
    window.currentProductMainImage = blob;
    $('#main-image-preview').innerHTML = `<img src="${url}" alt="Preview" style="width: 100%; height: 100%; object-fit: cover;">`;
  });
}

async function saveProduct() {
  const name = $('#product-name').value.trim();
  const description = $('#product-description').value.trim() || null;

  if (!name) {
    window.toast?.error('Product name is required');
    return;
  }

  // Collect packs
  const packs = [];
  $$('input[name="suggested-pack"]:checked').forEach(cb => {
    packs.push({
      pack_name: cb.value,
      quantity: parseNumber(cb.dataset.quantity),
      unit: cb.dataset.unit
    });
  });
  $$('.custom-pack-row').forEach(row => {
    const packName = row.querySelector('.custom-pack-name').value.trim();
    const quantity = parseNumber(row.querySelector('.custom-pack-qty').value);
    const unit = row.querySelector('.custom-pack-unit').value;
    if (packName && quantity > 0) packs.push({ pack_name: packName, quantity, unit });
  });

  if (!packs.length) {
    window.toast?.error('At least one pack size is required');
    return;
  }

  window.loading?.show();
  try {
    let productId = window.editingProductId;

    if (!productId) {
      const [product] = await apiPost('products', { name, description, active: true });
      productId = product.id;

      const variantsToCreate = packs.map(p => ({
        product_id: productId,
        pack_name: p.pack_name,
        quantity: p.quantity,
        unit: p.unit,
        default_rate: 0,
        active: true
      }));
      const variants = await apiPost('product_variants', variantsToCreate);

      // Upload main image
      if (window.currentProductMainImage instanceof Blob) {
        const path = `products/${productId}/main-${Date.now()}.jpg`;
        await window.supabase.uploadFile('product-images', path, window.currentProductMainImage);
        const url = window.supabase.getStorageUrl('product-images', path);
        await apiPost('product_images', { product_id: productId, image_url: url, sort_order: 0, active: true });
      }

      window.toast?.success('Product created');
    } else {
      await apiPatch('products', productId, { name, description });
      window.toast?.success('Product updated');
    }

    await loadProductsCache();
    location.hash = `#products/${productId}`;
  } catch (e) {
    console.error(e);
    window.toast?.error(e.message || 'Failed to save product');
  } finally {
    window.loading?.hide();
  }
}

// ============================================
// DETAIL
// ============================================
async function loadProductDetail(productId) {
  try {
    const product = window.productsCache.find(p => p.id === productId);
    if (!product) {
      const { data, error } = await apiGet('products', { id: `eq.${productId}`, single: true });
      if (error) throw error;
      if (!data) throw new Error('Product not found');
      window.productsCache.push(data);
    }
    renderProductDetailUI(product);
    window.currentProductId = productId;
  } catch (e) {
    console.error(e);
    window.toast?.error('Failed to load product');
  }
}

function renderProductDetailUI(product) {
  const container = $('#view-products');
  if (!container) return;

  // Replace the form/content area with detail view
  // We keep the outer view container but swap inner HTML
  const detailHtml = `
    <section class="view-content" style="padding: var(--space-4);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4); flex-wrap: wrap; gap: var(--space-3);">
        <h2 style="font-size: var(--text-xl); font-weight: var(--font-bold); margin: 0;">Product Details</h2>
        <div style="display: flex; gap: var(--space-2);">
          <button class="btn btn--outline" id="btn-edit-product" data-role-manager>Edit</button>
          <button class="btn btn--outline btn--danger" id="btn-archive-product" data-role-manager>Archive</button>
        </div>
      </div>

      <div class="card" style="margin-bottom: var(--space-4);">
        <div class="card__body" style="padding: var(--space-4);">
          <div style="display: flex; gap: var(--space-4); margin-bottom: var(--space-4);">
            <div style="width: 100px; height: 100px; border-radius: var(--radius-lg); background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0;">
              ${product.mainImage 
                ? `<img src="${product.mainImage}" alt="" style="width: 100%; height: 100%; object-fit: cover;">`
                : '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>'
              }
            </div>
            <div style="flex: 1; min-width: 0;">
              <h3 style="margin: 0 0 var(--space-1); font-size: var(--text-lg);">${product.name}</h3>
              ${product.description ? `<p style="margin: 0; color: var(--text-tertiary); font-size: var(--text-sm);">${product.description}</p>` : ''}
            </div>
          </div>

          <div style="margin-bottom: var(--space-4);">
            <h4 style="font-size: var(--text-sm); font-weight: var(--font-semibold); color: var(--text-tertiary); margin-bottom: var(--space-2); text-transform: uppercase;">Variants & Rates</h4>
            <div class="list">
              ${(product.variants || []).filter(v => v.active).map(v => `
                <div class="list-item" style="padding: var(--space-3) 0; border: none; background: none;">
                  <div class="list-item__content">
                    <div class="list-item__title">${v.pack_name}</div>
                    <div class="list-item__subtitle">${v.quantity} ${v.unit}</div>
                  </div>
                  <div class="list-item__meta"><span class="primary" style="font-family: var(--font-ui-mono);">${formatCurrency(v.default_rate)}</span></div>
                </div>
              `).join('')}
            </div>
          </div>

          <div>
            <h4 style="font-size: var(--text-sm); font-weight: var(--font-semibold); color: var(--text-tertiary); margin-bottom: var(--space-2); text-transform: uppercase;">Status</h4>
            <div style="display: flex; gap: var(--space-2);">
              <span class="badge ${product.active ? 'badge--success' : 'badge--archive'}">${product.active ? 'Active' : 'Archived'}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  container.innerHTML = detailHtml;
  $('#btn-edit-product')?.addEventListener('click', () => editProduct(product.id));
  $('#btn-archive-product')?.addEventListener('click', () => archiveProduct(product.id));
}

function editProduct(productId) {
  const product = window.productsCache.find(p => p.id === productId);
  if (!product) return;

  window.editingProductId = productId;
  const container = $('#view-container');
  const existing = container.querySelector('.view.active');
  if (existing) existing.remove();

  const viewEl = document.createElement('div');
  viewEl.className = 'view active';
  viewEl.id = 'view-products';
  viewEl.innerHTML = renderProductForm();
  container.appendChild(viewEl);

  initSuggestedPacks();
  setupProductForm();

  // Populate
  $('#product-name').value = product.name || '';
  $('#product-description').value = product.description || '';

  // Custom packs
  const suggestedNames = ['50g', '500g', '1kg'];
  const customVariants = (product.variants || []).filter(v => !suggestedNames.includes(v.pack_name));
  customVariants.forEach(v => addCustomPackRow({ pack_name: v.pack_name, quantity: v.quantity, unit: v.unit }));

  // Main image
  if (product.mainImage) {
    $('#main-image-preview').innerHTML = `<img src="${product.mainImage}" alt="Preview" style="width: 100%; height: 100%; object-fit: cover;">`;
  }

  // Rates (would need variants fetched, simplified)
  const ratesContainer = $('#product-rates-list');
  if (ratesContainer && product.variants) {
    ratesContainer.innerHTML = product.variants.filter(v => v.active).map(v => `
      <div style="display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) 0; border-bottom: 1px solid var(--separator);">
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: var(--font-medium);">${v.pack_name}</div>
          <div style="font-size: var(--text-xs); color: var(--text-tertiary);">${v.quantity} ${v.unit}</div>
        </div>
        <div class="input-group" style="width: 140px;">
          <span class="input-group__addon">₹</span>
          <input type="number" class="input-group__input rate-input" step="0.01" min="0" value="${v.default_rate}" data-variant-id="${v.id}" required>
        </div>
      </div>
    `).join('');
  }
}

async function archiveProduct(productId) {
  if (!confirm('Archive this product? It will be hidden from new orders.')) return;
  window.loading?.show();
  try {
    await apiPatch('products', productId, { active: false, archived_at: new Date().toISOString() });
    await loadProductsCache();
    if (window.currentProductId === productId) location.hash = '#/products';
    renderProductsGridUI();
    window.toast?.success('Product archived');
  } catch (e) {
    console.error(e);
    window.toast?.error('Failed to archive');
  } finally {
    window.loading?.hide();
  }
}

// ============================================
// CACHE
// ============================================
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

    window.productsCache = (products || []).map(p => ({
      ...p,
      variants: variantMap[p.id] || [],
      mainImage: imageMap[p.id]?.main || null,
      variantImages: imageMap[p.id]?.variants || {}
    }));
  } catch (e) {
    window.productsCache = [];
    window.toast?.error('Failed to load products');
  }
}

window.initViewProducts = initViewProducts;
window.renderViewProducts = renderViewProducts;