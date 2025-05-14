import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  first_name?: string | null;
  name?: string | null;
  email: string;
  role: string;
  last_sign_in_at?: string | null;
  created_at?: string;
  avatar_url?: string | null;
  phone_number?: string | null;
}

const FirstUserSetup = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const setupFirstUser = async () => {
      try {
        // 1. Check if user already has a profile
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        // 2. Check total user count
        const { count, error: countError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        if (countError) throw countError;

        // 3. Determine if this is the first user
        const isFirstUser = count === 0 || 
                          (count === 1 && existingProfile?.role !== 'admin');

        if (isFirstUser) {
          // 4. Prepare profile data
          const profileData: Profile = {
            first_name: user.user_metadata?.full_name?.split(' ')[0] || null,
            name: user.user_metadata?.full_name || null,
            email: user.email || '',
            role: 'admin',
            last_sign_in_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            avatar_url: user.user_metadata?.avatar_url || null,
            phone_number: user.phone || null
          };

          // 5. Upsert the profile
          const { error: upsertError } = await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              ...profileData,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'id'
            });

          if (upsertError) throw upsertError;

          // 6. Initialize admin permissions
          await initializeAdminPermissions();

          toast({
            title: 'Admin privileges granted',
            description: 'As the first registered user, you have been made an administrator.',
          });
        }
      } catch (error) {
        console.error('First user setup error:', error);
        toast({
          title: 'Setup Error',
          description: 'Failed to configure admin privileges. Please contact support.',
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

      for (const action of permissionActions) {
        await supabase
          .from('role_permissions')
          .upsert(
            { role: 'admin', action, allowed: true },
            { onConflict: 'role,action' }
          );
      }
    };

    setupFirstUser();
  }, [user, toast]);

  return null;
};

export default FirstUserSetup;
