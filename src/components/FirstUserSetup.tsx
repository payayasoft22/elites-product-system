import { useEffect } from 'react';
import { supabase, PermissionAction } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const FirstUserSetup = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const setupFirstUser = async () => {
      try {
        // 1. Check if this user already has a profile
        const { data: existingProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        // 2. Check total user count (including soft-deleted if applicable)
        const { count, error: countError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        if (countError) throw countError;

        // 3. Determine if this is the first/only user
        const isFirstUser = count === 0 || 
                           (count === 1 && existingProfile?.role !== 'admin');

        if (isFirstUser) {
          // 4. Create or update the profile with admin privileges
          const { error: upsertError } = await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              email: user.email,
              role: 'admin',
              is_first_user: true,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'id'  // Important for updates
            });

          if (upsertError) throw upsertError;

          // 5. Set up admin permissions
          const permissionActions: PermissionAction[] = [
            'add_product',
            'delete_product',
            // ... other permissions
          ];

          for (const action of permissionActions) {
            await supabase
              .from('role_permissions')
              .upsert(
                { role: 'admin', action, allowed: true },
                { onConflict: 'role,action' }
              );
          }

          toast({
            title: 'Admin Setup Complete',
            description: 'As the first user, you have been granted admin privileges.',
          });
        }
      } catch (error) {
        console.error('Error in first user setup:', error);
        toast({
          title: 'Setup Error',
          description: 'Failed to configure admin privileges.',
          variant: 'destructive'
        });
      }
    };

    setupFirstUser();
  }, [user, toast]);

  return null;
};

export default FirstUserSetup;
