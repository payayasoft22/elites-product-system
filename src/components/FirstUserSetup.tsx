
import { useEffect } from 'react';
import { supabase, PermissionAction } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

/**
 * This component ensures the first user registered becomes an admin
 * It's designed to be used once during initial setup
 */
useEffect(() => {
  if (!user) return;

  const setupFirstUser = async () => {
    try {
      // Check total user count (including soft-deleted accounts if applicable)
      const { count, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;

      // If no users exist (after deletions), make this user admin
      if (count === 0) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            role: 'admin',
            is_first_user: true  // Optional: Flag as first user
          })
          .eq('id', user.id);

        if (updateError) throw updateError;

        toast({
          title: 'Admin privileges granted',
          description: 'As the first registered user, you have been made an administrator.',
        });
      }
    } catch (error) {
      console.error('First user setup error:', error);
    }
  };

  setupFirstUser();
}, [user, toast]);

  // This component doesn't render anything
  return null;
};

export default FirstUserSetup;
