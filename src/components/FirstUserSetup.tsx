import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  first_name?: string | null;
  name?: string | null;
  email: string;
  role: string;
  last_sign_in_at?: string;
  created_at?: string;
  avatar_url?: string | null;
  phone_number?: string | null;
  updated_at?: string;
}

interface RolePermission {
  role: string;
  action: string;
  allowed: boolean;
}

const FirstUserSetup = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.id) return;

    const setupFirstUser = async () => {
      try {
        // 1. Check if user already has admin role
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (existingProfile?.role === 'admin') return;

        // 2. Check total user count
        const { count, error: countError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        if (countError) throw countError;

        // 3. If no users exist, make this user admin
        if (count === 0) {
          const profileData: Profile = {
            id: user.id,
            first_name: user.user_metadata?.full_name?.split(' ')[0] || null,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            email: user.email || '',
            role: 'admin',
            last_sign_in_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            avatar_url: user.user_metadata?.avatar_url || null,
            phone_number: user.phone || null,
            updated_at: new Date().toISOString()
          };

          // 4. Upsert the profile
          const { error: upsertError } = await supabase
            .from('profiles')
            .upsert(profileData);

          if (upsertError) throw upsertError;

          // 5. Initialize admin permissions
          await initializeAdminPermissions();

          toast({
            title: 'Admin privileges granted',
            description: 'As the first registered user, you have been made an administrator.',
          });
        }
      } catch (error: any) {
        console.error('First user setup error:', error);
        toast({
          title: 'Setup Error',
          description: error.message || 'Failed to configure admin privileges.',
          variant: 'destructive'
        });
      }
    };

    const initializeAdminPermissions = async () => {
      const permissions: RolePermission[] = [
        { role: 'admin', action: 'add_product', allowed: true },
        { role: 'admin', action: 'delete_product', allowed: true },
        { role: 'admin', action: 'edit_product', allowed: true },
        { role: 'admin', action: 'add_price_history', allowed: true },
        { role: 'admin', action: 'delete_price_history', allowed: true },
        { role: 'admin', action: 'edit_price_history', allowed: true },
        { role: 'user', action: 'add_product', allowed: false },
        { role: 'user', action: 'delete_product', allowed: false },
        { role: 'user', action: 'edit_product', allowed: false }
      ];

      const { error } = await supabase
        .from('role_permissions')
        .upsert(permissions, { onConflict: ['role', 'action'] });

      if (error) throw error;
    };

    setupFirstUser();
  }, [user, toast]);

  return null;
};

export default FirstUserSetup;
