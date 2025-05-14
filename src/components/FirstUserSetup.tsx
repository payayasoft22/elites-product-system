import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  first_name?: string | null;
  name?: string | null;
  email?: string;
  role: string;
  last_sign_in_at?: string;
  created_at?: string;
  avatar_url?: string | null;
  phone_number?: string | null;
  updated_at?: string;
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

        // 3. Determine if this is the first user
        const isFirstUser = count === 0;

        if (isFirstUser) {
          // 4. Prepare complete profile data
          const profileData: Profile = {
            id: user.id,
            first_name: user.user_metadata?.full_name?.split(' ')[0] || null,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            email: user.email || '',
            role: 'admin',
            last_sign_in_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
            phone_number: user.phone || null,
            updated_at: new Date().toISOString()
          };

          // 5. Insert or update the profile
          const { error: upsertError } = await supabase
            .from('profiles')
            .upsert(profileData, {
              onConflict: 'id',
              ignoreDuplicates: false
            });

          if (upsertError) throw upsertError;

          // 6. Initialize admin permissions
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
          description: error.message || 'Failed to configure admin privileges. Please contact support.',
          variant: 'destructive'
        });
      }
    };

    const initializeAdminPermissions = async () => {
      const permissionActions = [
        'add_product',
        'delete_product',
        'edit_product',
        'add_price_history',
        'delete_price_history',
        'edit_price_history',
        'manage_users',
        'manage_permissions'
      ];

      const { error } = await supabase
        .from('role_permissions')
        .upsert(
          permissionActions.map(action => ({
            role: 'admin',
            action,
            allowed: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })),
          { onConflict: 'role,action' }
        );

      if (error) throw error;
    };

    setupFirstUser();
  }, [user, toast]);

  return null;
};

export default FirstUserSetup;
