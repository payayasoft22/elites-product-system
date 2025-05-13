
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, PermissionAction } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

// Define types to match with the database schema
interface PermissionRequest {
  id: string;
  action: PermissionAction; 
  user_id: string;
  requested_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  status: 'pending' | 'approved' | 'rejected';
  user?: {
    email: string;
    name: string;
    first_name: string;
  };
}

// Type for the user role from the database
type UserRole = Database['public']['Enums']['user_role'];

export function usePermissionRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch my pending permission requests
  const myPermissionRequests = useQuery({
    queryKey: ['my_permission_requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('admin_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('requested_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching permission requests:', error);
        throw error;
      }
      
      // Cast the data to the correct type
      return (data || []) as unknown as PermissionRequest[];
    },
    enabled: !!user,
  });

  // Fetch all pending permission requests (for admins)
  const pendingPermissionRequests = useQuery({
    queryKey: ['pending_permission_requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_requests')
        .select(`
          *,
          user:profiles(
            email,
            name,
            first_name
          )
        `)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching pending permission requests:', error);
        throw error;
      }
      
      // Cast the data with unknown first to avoid type errors
      return (data || []) as unknown as PermissionRequest[];
    },
    enabled: !!user,
  });
  
  // Request a new permission
  const requestPermission = useMutation({
    mutationFn: async (action: PermissionAction) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      // First check if the user already has this permission
      const { data: roleData, error: roleError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
        
      if (roleError) throw roleError;
      
      const userRole = roleData?.role as UserRole;
      
      const { data: permissionData, error: permissionError } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role', userRole)
        .eq('action', action)
        .single();
        
      if (!permissionError && permissionData?.allowed) {
        throw new Error('You already have this permission');
      }
      
      // Check if there's already a pending request for this action
      // Using type assertion to fix the type issues
      const { data: existingRequests, error: existingError } = await supabase
        .from('admin_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('action', action)
        .eq('status', 'pending')
        .limit(1);
        
      if (existingError) throw existingError;
      
      if (existingRequests && existingRequests.length > 0) {
        throw new Error('You already have a pending request for this permission');
      }
      
      // Insert the new permission request
      const { data: newRequest, error } = await supabase
        .from('admin_requests')
        .insert({
          user_id: user.id,
          action: action,
          status: 'pending',
          requested_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (error) throw error;
      
      // Create a notification for all admins
      await supabase
        .from('notifications')
        .insert({
          type: 'permission_request',
          content: {
            user_id: user.id,
            action: action,
            requested_at: new Date().toISOString()
          },
          is_read: false
        });
        
      return newRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_permission_requests'] });
      toast({
        title: 'Permission Requested',
        description: 'Your permission request has been submitted.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Request Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Approve a permission request (admin only)
  const approvePermissionRequest = useMutation({
    mutationFn: async (request: PermissionRequest) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      // Update the permission request
      const { error: updateRequestError } = await supabase
        .from('admin_requests')
        .update({
          status: 'approved',
          resolved_at: new Date().toISOString(),
          resolved_by: user.id
        })
        .eq('id', request.id);
        
      if (updateRequestError) throw updateRequestError;
      
      // Get the user's role
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', request.user_id)
        .single();
        
      if (userError) throw userError;
      
      const userRole = userData?.role as UserRole;
      
      // Check if the role_permission record exists
      const { data: existingPermission, error: existingError } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role', userRole)
        .eq('action', request.action as PermissionAction)
        .limit(1);
        
      if (existingError) throw existingError;
      
      let permissionAction;
      
      if (existingPermission && existingPermission.length > 0) {
        // Update existing permission
        const { error: permissionError } = await supabase
          .from('role_permissions')
          .update({
            allowed: true
          })
          .eq('role', userRole)
          .eq('action', request.action as PermissionAction);
          
        if (permissionError) throw permissionError;
        
        permissionAction = 'updated';
      } else {
        // Insert new permission
        const { error: permissionError } = await supabase
          .from('role_permissions')
          .insert({
            role: userRole,
            action: request.action as PermissionAction,
            allowed: true
          });
          
        if (permissionError) throw permissionError;
        
        permissionAction = 'created';
      }
      
      // Create a notification for the user
      await supabase
        .from('notifications')
        .insert({
          type: 'permission_request_resolved',
          content: {
            action: request.action,
            status: 'approved',
            resolved_at: new Date().toISOString(),
            resolved_by: user.id
          },
          user_id: request.user_id,
          is_read: false
        });
        
      return { requestId: request.id, permissionAction };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending_permission_requests'] });
      toast({
        title: 'Permission Approved',
        description: 'The permission request has been approved.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Approval Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Reject a permission request (admin only)
  const rejectPermissionRequest = useMutation({
    mutationFn: async (request: PermissionRequest) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      // Update the permission request
      const { error: updateRequestError } = await supabase
        .from('admin_requests')
        .update({
          status: 'rejected',
          resolved_at: new Date().toISOString(),
          resolved_by: user.id
        })
        .eq('id', request.id);
        
      if (updateRequestError) throw updateRequestError;
      
      // Create a notification for the user
      await supabase
        .from('notifications')
        .insert({
          type: 'permission_request_resolved',
          content: {
            action: request.action,
            status: 'rejected',
            resolved_at: new Date().toISOString(),
            resolved_by: user.id
          },
          user_id: request.user_id,
          is_read: false
        });
        
      return { requestId: request.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending_permission_requests'] });
      toast({
        title: 'Permission Rejected',
        description: 'The permission request has been rejected.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Rejection Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  return {
    myPermissionRequests: {
      data: myPermissionRequests.data || [],
      isLoading: myPermissionRequests.isLoading,
      error: myPermissionRequests.error
    },
    pendingPermissionRequests: {
      data: pendingPermissionRequests.data || [],
      isLoading: pendingPermissionRequests.isLoading,
      error: pendingPermissionRequests.error
    },
    requestPermission,
    approvePermissionRequest,
    rejectPermissionRequest
  };
}
