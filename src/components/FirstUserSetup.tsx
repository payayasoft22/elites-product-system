
import { useEffect } from 'react';
import { supabase, PermissionAction } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

/**
 * This component ensures the first user registered becomes an admin
 * It's designed to be used once during initial setup
 */
const FirstUserSetup = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const setupFirstUser = async () => {
      try {
        // Check if this is the first user in the system
        const { count, error: countError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        if (countError) {
          console.error('Error checking profile count:', countError);
          return;
        }

        // If only one user exists (this user), make them admin
        if (count === 1) {
          // Update user role to admin
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', user.id);

          if (updateError) {
            console.error('Error updating first user to admin:', updateError);
            return;
          }

          // Define the permission actions
          const permissionActions: PermissionAction[] = [
            'add_product',
            'delete_product',
            'edit_product',
            'add_price_history',
            'delete_price_history',
            'edit_price_history'
          ];

          // Insert initial permissions for admin role one by one
          for (const action of permissionActions) {
            await supabase
              .from('role_permissions')
              .upsert(
                { role: 'admin', action, allowed: true },
                { onConflict: 'role,action' }
              );
          }

          // Set default permissions for regular users one by one
          for (const action of permissionActions) {
            await supabase
              .from('role_permissions')
              .upsert(
                { role: 'user', action, allowed: false },
                { onConflict: 'role,action' }
              );
          }

          toast({
            title: 'Admin Setup Complete',
            description: 'As the first user, you have been granted admin privileges in the Elites Project System.',
          });
        }
      } catch (error) {
        console.error('Error in first user setup:', error);
      }
    };

    setupFirstUser();
  }, [user, toast]);

  // This component doesn't render anything
  return null;
};

export default FirstUserSetup;
