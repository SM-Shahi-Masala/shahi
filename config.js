// SHAHI - Supabase Configuration
window.SHAHI_CONFIG = {
  supabaseUrl: 'https://puimqtzjhykbcguutlcl.supabase.co',
  supabaseAnonKey: 'sb_publishable_LcHnEYNwJ2wG9duNkt1kWQ_134NU5zk',

  appName: 'SHAHI',
  logoUrl: 'https://res.cloudinary.com/stw0awze/image/upload/v1792609127/Shahi_Taste_the_Difference_Logo.png',

  billPrefix: 'SH',

  pwaName: 'SHAHI Billing',
  pwaShortName: 'SHAHI',
  pwaThemeColor: '#dc2626',
  pwaBackgroundColor: '#ffffff',

  suggestedPackSizes: [
    { pack_name: '50g', quantity: 50, unit: 'g' },
    { pack_name: '500g', quantity: 500, unit: 'g' },
    { pack_name: '1kg', quantity: 1, unit: 'kg' }
  ],

  packUnits: ['g', 'kg', 'pcs', 'ml', 'l']
};

window.supabase = null;