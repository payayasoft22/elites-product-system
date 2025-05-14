import { useEffect } from 'react';
import { supabase, PermissionAction } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  role: string;
  email?: string;
  updated_at?: string;
}

const FirstUserSetup = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.id) return;

    const setupFirstUser = async () => {
      try {
        // 1. First check if the user already has a profile
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Error checking existing profile:', profileError);
          throw profileError;
        }

        // Skip if already admin
        if (existingProfile?.role === 'admin') return;

        // 2. Check total user count
        const { count, error: countError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        if (countError) {
          console.error('Error checking profile count:', countError);
          throw countError;
        }

        // 3. If no users exist or this is the first user, make admin
        if (count === 0 || (count === 1 && !existingProfile)) {
          const profileData: Profile = {
            id: user.id,
            role: 'admin',
            email: user.email || undefined,
            updated_at: new Date().toISOString()
          };

          // 4. Upsert the profile (create or update)
          const { error: upsertError } = await supabase
            .from('profiles')
            .upsert(profileData, {
              onConflict: 'id'
            });

          if (upsertError) {
            console.error('Error upserting profile:', upsertError);
            throw upsertError;
          }

          // 5. Initialize permissions
          await initializePermissions();

          toast({
            title: 'Admin Setup Complete',
            description: 'As the first user, you have been granted admin privileges.',
          });
        }
      } catch (error: any) {
        console.error('Error in first user setup:', error);
        toast({
          title: 'Setup Error',
          description: error.message || 'Failed to configure admin privileges.',
          variant: 'destructive'
        });
      }
    };

    const initializePermissions = async () => {
      const permissionActions: PermissionAction[] = [
        'add_product',
        'delete_product',
        'edit_product',
        'add_price_history',
        'delete_price_history',
        'edit_price_history'
      ];

      // Batch insert permissions in a single transaction
      const { error } = await supabase
        .from('role_permissions')
        .upsert(
          [
            ...permissionActions.map(action => ({
              role: 'admin',
              action,
              allowed: true
            })),
            ...permissionActions.map(action => ({
              role: 'user',
              action,
              allowed: false
            }))
          ],
          { onConflict: 'role,action' }
        );

      if (error) throw error;
    };

    setupFirstUser();
  }, [user, toast]);

  return null;
};

export default FirstUserSetup;
