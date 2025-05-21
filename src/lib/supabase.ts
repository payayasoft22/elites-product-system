import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export const TABLE_NAMES = {
  NOTIFICATIONS: 'notifications',
  PRODUCTS: 'products',
  ROLE_PERMISSIONS: 'role_permissions',
  ADMIN_REQUESTS: 'admin_requests',
  PROFILES: 'profiles',
  PRICE_HISTORY: 'pricehist'
};
