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
        // Check if this is the first user in the system
        const { count, error: countError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        if (countError) throw countError;

        // If no users exist yet, this is the first user
        if (count === 0) {
          // Update user as first user and admin
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
              role: 'admin',
              is_first_user: true 
            })
            .eq('id', user.id);

          if (updateError) throw updateError;

          // Define the permission actions
          const permissionActions: PermissionAction[] = [
            'add_product',
            'delete_product',
            'edit_product',
            'add_price_history',
            'delete_price_history',
            'edit_price_history'
          ];

          // Batch insert permissions
          const { error: permError } = await supabase
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

          if (permError) throw permError;

          toast({
            title: 'Admin Setup Complete',
            description: 'As the first user, you have been granted admin privileges.',
          });
        }
      } catch (error) {
        console.error('Error in first user setup:', error);
        toast({
          title: 'Setup Error',
          description: 'Failed to complete first user setup.',
          variant: 'destructive'
        });
      }
    };

    setupFirstUser();
  }, [user, toast]);

  return null;
};

export default FirstUserSetup;
