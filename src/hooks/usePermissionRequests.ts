
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { PermissionAction } from "@/integrations/supabase/client";

export interface PermissionRequest {
  id: string;
  user_id: string;
  action: PermissionAction;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  resolved_at?: string | null;
  resolved_by?: string | null;
  user_name?: string;
  user_email?: string;
}

export function usePermissionRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get permission requests for the current user
  const { data: userRequests, isLoading: userRequestsLoading } = useQuery({
    queryKey: ["permission_requests", "user", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("permission_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error fetching permission requests:", error);
        throw error;
      }
      
      return data;
    },
    enabled: !!user,
  });

  // Get all permission requests (for admins)
  const { data: allRequests, isLoading: allRequestsLoading } = useQuery({
    queryKey: ["permission_requests", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permission_requests")
        .select(`
          *,
          profiles:user_id (
            email,
            first_name,
            name
          )
        `)
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error fetching all permission requests:", error);
        throw error;
      }
      
      // Transform data to include user details
      return data.map((item: any) => ({
        ...item,
        user_email: item.profiles?.email,
        user_name: item.profiles?.first_name || item.profiles?.name || 'Unknown User'
      }));
    },
    enabled: !!user,
  });

  // Request a permission
  const requestPermission = useMutation({
    mutationFn: async (action: PermissionAction) => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const { error } = await supabase
        .from("permission_requests")
        .insert([
          { 
            user_id: user.id,
            action: action,
            status: "pending"
          }
        ]);
      
      if (error) throw error;
      
      // Notify admins
      const { data: admins } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin");
      
      if (admins && admins.length > 0) {
        const notifications = admins.map(admin => ({
          type: "permission_request",
          content: {
            action: action,
            requested_by: user.email,
            requested_at: new Date().toISOString()
          },
          user_id: admin.id
        }));
        
        await supabase.from("notifications").insert(notifications);
      }
    },
    onSuccess: () => {
      toast({
        title: "Request submitted",
        description: "Your permission request has been submitted for approval.",
      });
      queryClient.invalidateQueries({ queryKey: ["permission_requests"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Request failed",
        description: error.message || "Failed to submit permission request.",
        variant: "destructive",
      });
    },
  });

  // Approve a permission request
  const approveRequest = useMutation({
    mutationFn: async (requestId: string) => {
      if (!user?.id) throw new Error("User not authenticated");
      
      // Get the request details
      const { data: request, error: requestError } = await supabase
        .from("permission_requests")
        .select("*")
        .eq("id", requestId)
        .single();
      
      if (requestError) throw requestError;
      
      // Update request status
      const { error: updateError } = await supabase
        .from("permission_requests")
        .update({ 
          status: "approved",
          resolved_at: new Date().toISOString(),
          resolved_by: user.id
        })
        .eq("id", requestId);
      
      if (updateError) throw updateError;
      
      // Notify the user
      await supabase.from("notifications").insert({
        type: "permission_request_resolved",
        content: {
          request_id: requestId,
          action: request.action,
          status: "approved",
          resolved_by: user.email,
          resolved_at: new Date().toISOString()
        },
        user_id: request.user_id
      });
    },
    onSuccess: () => {
      toast({
        title: "Request approved",
        description: "The permission request has been approved.",
      });
      queryClient.invalidateQueries({ queryKey: ["permission_requests"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Approval failed",
        description: error.message || "Failed to approve permission request.",
        variant: "destructive",
      });
    },
  });

  // Reject a permission request
  const rejectRequest = useMutation({
    mutationFn: async (requestId: string) => {
      if (!user?.id) throw new Error("User not authenticated");
      
      // Get the request details
      const { data: request, error: requestError } = await supabase
        .from("permission_requests")
        .select("*")
        .eq("id", requestId)
        .single();
      
      if (requestError) throw requestError;
      
      // Update request status
      const { error: updateError } = await supabase
        .from("permission_requests")
        .update({ 
          status: "rejected",
          resolved_at: new Date().toISOString(),
          resolved_by: user.id
        })
        .eq("id", requestId);
      
      if (updateError) throw updateError;
      
      // Notify the user
      await supabase.from("notifications").insert({
        type: "permission_request_resolved",
        content: {
          request_id: requestId,
          action: request.action,
          status: "rejected",
          resolved_by: user.email,
          resolved_at: new Date().toISOString()
        },
        user_id: request.user_id
      });
    },
    onSuccess: () => {
      toast({
        title: "Request rejected",
        description: "The permission request has been rejected.",
      });
      queryClient.invalidateQueries({ queryKey: ["permission_requests"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Rejection failed",
        description: error.message || "Failed to reject permission request.",
        variant: "destructive",
      });
    },
  });

  // Check if user has a pending request for a specific action
  const hasPendingRequest = (action: PermissionAction): boolean => {
    return userRequests ? userRequests.some(
      (req: any) => req.action === action && req.status === "pending"
    ) : false;
  };

  return {
    userRequests,
    allRequests,
    userRequestsLoading,
    allRequestsLoading,
    requestPermission,
    approveRequest,
    rejectRequest,
    hasPendingRequest,
  };
}
