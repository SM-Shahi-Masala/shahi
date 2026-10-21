# SHAHI - Deployment Guide

## Quick Start

### 1. Set up Supabase
1. Create a new project at https://supabase.com
2. Go to **SQL Editor** and run the contents of `supabase-schema.sql`
3. Go to **Storage** → Create bucket named `product-images` (public)
4. Go to **Authentication** → Enable Email provider
5. Copy your **Project URL** and **anon/public key** from Settings → API

### 2. Configure the App
Edit `public/config.js`:
```javascript
window.SHAHI_CONFIG = {
  supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
  supabaseAnonKey: 'YOUR_ANON_KEY_HERE',
  // ... rest stays the same
};
```

### 3. Create First Owner User
1. Deploy the app (see below)
2. Sign up with your email in the app
3. In Supabase **Table Editor** → `users` table, find your user and set `role = 'owner'`
4. Refresh the app - you'll now have full access

### 4. Deploy

#### Option A: Netlify (Recommended)
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
cd "C:\Users\user\Shahi (project 2)"
netlify deploy --prod --dir=public
```

#### Option B: Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd "C:\Users\user\Shahi (project 2)"
vercel --prod public
```

#### Option C: Firebase Hosting
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login and init
firebase login
firebase init hosting
# Select "public" as public directory
# Configure as SPA? No (it's hash routing)
firebase deploy
```

#### Option D: Supabase Hosting (if available)
```bash
supabase login
supabase projects create
supabase deploy --project-ref YOUR_PROJECT_REF
```

#### Option E: Any Static Host
Upload the `public/` folder contents to any static hosting (GitHub Pages, Cloudflare Pages, AWS S3, etc.)

---

## Project Structure

```
public/
├── index.html          # Main HTML shell (all views)
├── config.js           # Supabase config (EDIT THIS)
├── manifest.webmanifest # PWA manifest
├── sw.js               # Service worker (offline support)
├── css/
│   └── app.css         # Complete design system
├── js/
│   ├── core.js         # Utilities, Supabase client, state, router
│   ├── start.js        # App bootstrap, auth, global helpers
│   ├── views-home.js   # Dashboard
│   ├── views-orders.js # Orders (list, create, detail)
│   ├── views-customers.js # Customers (CRUD, rates)
│   ├── views-products.js  # Products (CRUD, images, packs)
│   └── views-admin.js    # Settings, users, bill config
└── assets/
    └── product-images/ # Empty folder for local assets
```

---

## Features Implemented

### ✅ Core Features
- **Products**: Multi-variant (pack sizes), images, default rates, archive
- **Customers**: Full CRUD, custom rates per variant, quick-create from order
- **Orders**: Customer → Product → Pack → Qty → Rate → Bill flow
- **Pricing**: Customer-specific rates override defaults, historical snapshots
- **Billing**: Print, Share (Web Share API), WhatsApp with prefilled message
- **Roles**: Owner/Admin (full), Manager (granted perms), Staff (explicit perms)

### ✅ Technical
- **PWA**: Offline-first service worker, installable, manifest
- **HTML-first**: Semantic markup, vanilla JS, no build step
- **Mobile-first**: 44px touch targets, bottom nav, sheets
- **Responsive**: Works on desktop (sidebar-like) and mobile
- **Print-ready**: Clean bill layout with `@media print`
- **Red/White theme**: CSS custom properties, consistent design system

### ✅ Data Integrity
- **Historical pricing**: Order items store exact rate snapshots
- **Archive not delete**: Products/customers hidden from new orders
- **Server validation**: All prices/totals recalculated on backend
- **RLS policies**: Row-level security on all tables

---

## Key Files to Customize

| File | Purpose |
|------|---------|
| `public/config.js` | **Must edit** - Supabase credentials |
| `supabase-schema.sql` | Run once in Supabase SQL Editor |
| `public/css/app.css` | Colors, spacing, components (design tokens in `:root`) |
| `public/js/views-*.js` | Business logic per view |

---

## Color Customization

Edit CSS custom properties in `app.css`:

```css
:root {
  --color-red-600: #dc2626;    /* Primary action color */
  --color-red-700: #b91c1c;    /* Darker accent */
  --color-red-50: #fef2f2;     /* Light backgrounds */
  /* ... full palette available */
}
```

---

## Adding New Features

1. **Database**: Add migration SQL to `supabase-schema.sql` (or create new migration)
2. **API**: Use `apiGet/apiPost/apiPatch/apiDelete` in views
3. **UI**: Follow existing patterns in `views-*.js`
4. **Styles**: Use design tokens from `app.css`

---

## Troubleshooting

### "Failed to load" errors
- Check `config.js` has correct Supabase URL/key
- Verify RLS policies allow authenticated reads
- Check browser console for CORS/network errors

### Images not uploading
- Verify `product-images` bucket exists and is public
- Check Storage policies allow authenticated upload

### PWA not installing
- Must serve over HTTPS (localhost works)
- Check `manifest.webmanifest` is accessible
- Verify service worker registers (DevTools → Application)

### Auth not persisting
- Check `localStorage` isn't blocked
- Verify Supabase Auth settings (email confirm off for dev)

---

## Support

For issues:
1. Check browser console (F12)
2. Check Supabase logs (Dashboard → Logs)
3. Verify all SQL ran successfully

---

## License

Internal use only - SHAHI Masala Business Application