
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PermissionRequest {
  id: string;
  user_id: string;
  requested_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  status: 'pending' | 'approved' | 'rejected';
  user?: {
    id: string;
    email: string;
    first_name?: string;
    name?: string;
  };
  resolver?: {
    id: string;
    email: string;
    first_name?: string;
    name?: string;
  };
}

export const usePermissionRequests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<{id: string, action: 'approve' | 'reject'} | null>(null);

  // Get my requests
  const { data: myRequests, isLoading: isLoadingMyRequests } = useQuery({
    queryKey: ['permissionRequests', 'my'],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('admin_requests')
        .select(`
          *
        `)
        .eq('user_id', user.id)
        .order('requested_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching permission requests:', error);
        toast({
          title: "Error",
          description: "Failed to load your permission requests",
          variant: "destructive",
        });
        throw error;
      }
      
      // Cast the data to the correct type
      return (data || []) as unknown as PermissionRequest[];
    },
    enabled: !!user,
  });

  // Get admin requests
  const { data: pendingRequests, isLoading: isLoadingPendingRequests } = useQuery({
    queryKey: ['permissionRequests', 'pending'],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('admin_requests')
        .select(`
          *,
          user:user_id (
            id,
            email,
            first_name,
            name
          )
        `)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching pending requests:', error);
        toast({
          title: "Error",
          description: "Failed to load permission requests",
          variant: "destructive",
        });
        throw error;
      }
      
      // Cast the data with unknown first to avoid type errors
      return (data || []) as unknown as PermissionRequest[];
    },
    enabled: !!user,
  });

  // Mutation to request admin privileges
  const { mutate: requestAdminPrivileges, isPending: isRequestingAdmin } = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not authenticated");
      
      // Define the action - required for type safety
      const action = 'admin_access';
      
      if (!action) {
        throw new Error('Action is required');
      }
      
      // Using type assertion to fix the type issues
      const { data: existingRequests, error: existingError } = await supabase
        .from('admin_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending');
        
      if (existingError) throw existingError;
      
      // Check for an existing pending request
      if (existingRequests && existingRequests.length > 0) {
        toast({
          title: "Request already exists",
          description: "You already have a pending request for admin access",
          variant: "default",
        });
        return;
      }
      
      // Create a new request
      const { error } = await supabase
        .from('admin_requests')
        .insert([
          { 
            user_id: user.id, 
            status: 'pending',
          }
        ]);
      
      if (error) throw error;
      
      toast({
        title: "Request submitted",
        description: "Your request for admin privileges has been submitted",
      });
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissionRequests'] });
    },
    onError: (error: any) => {
      console.error('Error requesting admin privileges:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit request",
        variant: "destructive",
      });
    }
  });

  // Mutation to resolve a request (approve or reject)
  const { mutate: resolveRequest, isPending: isResolvingRequest } = useMutation({
    mutationFn: async ({ id, action }: { id: string, action: 'approve' | 'reject' }) => {
      if (!user) throw new Error("User not authenticated");
      
      setPendingAction({ id, action });
      
      const { error } = await supabase
        .from('admin_requests')
        .update({ 
          status: action === 'approve' ? 'approved' : 'rejected',
          resolved_at: new Date().toISOString(),
          resolved_by: user.id
        })
        .eq('id', id);
      
      if (error) throw error;

      // If approved, update the user's role to admin
      if (action === 'approve') {
        const { data: requestData, error: requestError } = await supabase
          .from('admin_requests')
          .select('user_id')
          .eq('id', id)
          .single();
          
        if (requestError) throw requestError;
        
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ role: 'admin' })
          .eq('id', requestData.user_id);
          
        if (profileError) throw profileError;
      }
      
      toast({
        title: action === 'approve' ? "Request approved" : "Request rejected",
        description: action === 'approve' 
          ? "The user has been granted admin privileges" 
          : "The request has been rejected",
      });
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissionRequests'] });
      setPendingAction(null);
    },
    onError: (error: any) => {
      console.error('Error resolving request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process request",
        variant: "destructive",
      });
      setPendingAction(null);
    }
  });

  return {
    myRequests,
    pendingRequests,
    isLoadingMyRequests,
    isLoadingPendingRequests,
    requestAdminPrivileges,
    isRequestingAdmin,
    resolveRequest,
    isResolvingRequest,
    pendingAction
  };
};
