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
        // 1. First check if user already has a profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, is_first_user')
          .eq('id', user.id)
          .single();

        // If profile exists and already has a role, skip
        if (profile && profile.role) return;

        // 2. Check if this is the first user
        const { count, error: countError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        if (countError) throw countError;

        const isFirstUser = count === 0;

        // 3. Update profile accordingly
        const { error: updateError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            role: isFirstUser ? 'admin' : 'user',
            is_first_user: isFirstUser,
            updated_at: new Date().toISOString()
          });

        if (updateError) throw updateError;

        if (isFirstUser) {
          // Define and insert permissions
          const actions = [
            'add_product', 'delete_product', 'edit_product',
            'add_price_history', 'delete_price_history', 'edit_price_history'
          ];

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

    // Add slight delay to ensure profile creation is complete
    const timer = setTimeout(setupFirstUser, 500);
    return () => clearTimeout(timer);
  }, [user, toast]);

  return null;
};

export default FirstUserSetup;
