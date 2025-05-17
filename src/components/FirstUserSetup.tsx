import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const FirstUserSetup = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const setupFirstUser = async () => {
      try {
        // Check if this is the first user
        const { count, error: countError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        if (countError) throw countError;

        // If no users exist, make this user admin
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
          const actions = [
            'add_product', 'delete_product', 'edit_product',
            'add_price_history', 'delete_price_history', 'edit_price_history'
          ];

          // Insert permissions
          const { error: permError } = await supabase
            .from('role_permissions')
            .upsert(
              actions.map(action => ({
                role: 'admin',
                action,
                allowed: true
              })),
              { onConflict: 'role,action' }
            );

          if (permError) throw permError;

          toast({
            title: 'Admin privileges granted',
            description: 'As the first user, you have full admin access.',
          });
        }
      } catch (error) {
        console.error('First user setup failed:', error);
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
