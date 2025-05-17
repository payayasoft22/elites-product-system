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
        // Check total user count (including unconfirmed)
        const { count, error: countError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        if (countError) throw countError;

        // If this is the first confirmed user
        if (count === 0) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
              role: 'admin',
              is_first_user: true 
            })
            .eq('id', user.id);

          if (updateError) throw updateError;

          // Define permissions
          const actions: PermissionAction[] = [
            'add_product', 'delete_product', 'edit_product',
            'add_price_history', 'delete_price_history', 'edit_price_history'
          ];

          // Insert permissions in a single transaction
          const { error: permError } = await supabase
            .from('role_permissions')
            .upsert([
              ...actions.map(a => ({ role: 'admin', action: a, allowed: true })),
              ...actions.map(a => ({ role: 'user', action: a, allowed: false }))
            ], { onConflict: 'role,action' });

          if (permError) throw permError;

          toast({
            title: 'Admin privileges granted',
            description: 'As the first user, you have full admin access.',
          });
        }
      } catch (error) {
        console.error('First user setup failed:', error);
      }
    };

    setupFirstUser();
  }, [user, toast]);

  return null;
};
  return null;
};

export default FirstUserSetup;
