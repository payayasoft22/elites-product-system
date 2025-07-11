import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { PermissionAction } from "@/hooks/usePermission";

export interface PermissionRequest {
  id: string;
  user_id: string;
  action?: PermissionAction;
  status: "pending" | "approved" | "rejected";
  requested_at?: string;
  resolved_at?: string | null;
  resolved_by?: string | null;
  user_name?: string;
  user_email?: string;
}

export function usePermissionRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: userRequests, isLoading: userRequestsLoading } = useQuery({
    queryKey: ["permission_requests", "user", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("admin_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("requested_at", { ascending: false });
      
      if (error) {
        console.error("Error fetching permission requests:", error);
        throw error;
      }
      
      return data as PermissionRequest[] || [];
    },
    enabled: !!user,
  });

  const { data: allRequests, isLoading: allRequestsLoading } = useQuery({
    queryKey: ["permission_requests", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_requests")
        .select(`
          *,
          profiles(email, first_name, name)
        `)
        .order("requested_at", { ascending: false });
      
      if (error) {
        console.error("Error fetching all permission requests:", error);
        throw error;
      }
      
      return (data || []).map((item: any) => ({
        ...item,
        user_email: item.profiles?.email,
        user_name: item.profiles?.first_name || item.profiles?.name || 'Unknown User'
      })) as PermissionRequest[];
    },
    enabled: !!user,
  });

  const requestPermission = useMutation({
    mutationFn: async (action: PermissionAction) => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const { error } = await supabase
        .from("admin_requests")
        .insert([
          { 
            user_id: user.id,
            action: action,
            status: "pending"
          }
        ]);
      
      if (error) throw error;
      
      const { data: admins } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin");
      
      if (admins && admins.length > 0) {
        const notifications = admins.map(admin => ({
          type: "permission_request",
          content: JSON.stringify({
            action: action,
            requested_by: user.email,
            requested_at: new Date().toISOString()
          }),
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

  const approveRequest = useMutation({
    mutationFn: async (requestId: string) => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const { data: request, error: requestError } = await supabase
        .from("admin_requests")
        .select("*")
        .eq("id", requestId)
        .single();
      
      if (requestError) throw requestError;
      
      const { error: updateError } = await supabase
        .from("admin_requests")
        .update({ 
          status: "approved",
          resolved_at: new Date().toISOString(),
          resolved_by: user.id
        })
        .eq("id", requestId);
      
      if (updateError) throw updateError;
      
      if (request && 'action' in request) {
        await supabase.from("notifications").insert({
          type: "permission_request_resolved",
          content: JSON.stringify({
            request_id: requestId,
            action: request.action,
            status: "approved",
            resolved_by: user.email,
            resolved_at: new Date().toISOString()
          }),
          user_id: request.user_id
        });
      }
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

  const rejectRequest = useMutation({
    mutationFn: async (requestId: string) => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const { data: request, error: requestError } = await supabase
        .from("admin_requests")
        .select("*")
        .eq("id", requestId)
        .single();
      
      if (requestError) throw requestError;
      
      const { error: updateError } = await supabase
        .from("admin_requests")
        .update({ 
          status: "rejected",
          resolved_at: new Date().toISOString(),
          resolved_by: user.id
        })
        .eq("id", requestId);
      
      if (updateError) throw updateError;
      
      if (request && 'action' in request) {
        await supabase.from("notifications").insert({
          type: "permission_request_resolved",
          content: JSON.stringify({
            request_id: requestId,
            action: request.action,
            status: "rejected",
            resolved_by: user.email,
            resolved_at: new Date().toISOString()
          }),
          user_id: request.user_id
        });
      }
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

  const hasPendingRequest = (action: PermissionAction): boolean => {
    if (!userRequests) return false;
    
    return userRequests.some(
      (req: any) => req.action === action && req.status === "pending"
    );
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
