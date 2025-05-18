// src/components/FirstUserSetup.tsx
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const FirstUserSetup = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const setupFirstUser = async () => {
      try {
        // This is just a backup check - most logic is now in AuthProvider
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, is_first_user')
          .eq('id', user.id)
          .single();

        if (!profile?.role) {
          const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

          if (count === 0) {
            await supabase
              .from('profiles')
              .update({
                role: 'admin',
                is_first_user: true
              })
              .eq('id', user.id);
          }
        }
      } catch (error) {
        console.error('First user setup check failed:', error);
      }
    };

    setupFirstUser();
  }, [user, toast]);

  return null;
};

export default FirstUserSetup;
