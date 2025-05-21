import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface AdminRequest {
  id: string;
  user_id: string;
  status: string;
  requested_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  name?: string;
  email?: string;
}

export function useAdminRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: currentUserRequest } = useQuery({
    queryKey: ["admin_requests", "current_user"],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("admin_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("requested_at", { ascending: false })
        .limit(1);
      
      if (error) {
        console.error("Error fetching current user admin requests:", error);
        throw error;
      }
      
      return data.length > 0 ? data[0] : null;
    },
    enabled: !!user,
  });

  const { data: allRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ["admin_requests", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_requests")
        .select(`
          *,
          profiles:user_id (
            name,
            email,
            first_name
          )
        `);
      
      if (error) {
        console.error("Error fetching admin requests:", error);
        throw error;
      }
      
      return data.map(req => {
        const profiles = req.profiles as { name?: string; first_name?: string; email?: string } | null;
        
        return {
          ...req,
          name: profiles?.name || profiles?.first_name || "Unknown",
          email: profiles?.email || "Unknown"
        };
      });
    },
    enabled: !!user,
  });

  const requestAdminRole = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("No user ID available");
      
      const { error } = await supabase
        .from("admin_requests")
        .insert([
          { user_id: user.id }
        ]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Request submitted",
        description: "Your request to become an admin has been submitted.",
      });
      queryClient.invalidateQueries({ queryKey: ["admin_requests"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Request failed",
        description: error.message || "Failed to submit admin request.",
        variant: "destructive",
      });
    },
  });

  const approveRequest = useMutation({
    mutationFn: async ({ requestId, userId }: { requestId: string, userId: string }) => {
      if (!user?.id) throw new Error("No user ID available");
      
      const { error: requestError } = await supabase
        .from("admin_requests")
        .update({
          status: "approved",
          resolved_at: new Date().toISOString(),
          resolved_by: user.id
        })
        .eq("id", requestId);
      
      if (requestError) throw requestError;
      
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ role: "admin" })
        .eq("id", userId);
      
      if (profileError) throw profileError;
    },
    onSuccess: () => {
      toast({
        title: "Request approved",
        description: "The user has been granted admin privileges.",
      });
      queryClient.invalidateQueries({ queryKey: ["admin_requests"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Approval failed",
        description: error.message || "Failed to approve admin request.",
        variant: "destructive",
      });
    },
  });

  const rejectRequest = useMutation({
    mutationFn: async (requestId: string) => {
      if (!user?.id) throw new Error("No user ID available");
      
      const { error } = await supabase
        .from("admin_requests")
        .update({
          status: "rejected",
          resolved_at: new Date().toISOString(),
          resolved_by: user.id
        })
        .eq("id", requestId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Request rejected",
        description: "The admin request has been rejected.",
      });
      queryClient.invalidateQueries({ queryKey: ["admin_requests"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Rejection failed",
        description: error.message || "Failed to reject admin request.",
        variant: "destructive",
      });
    },
  });

  return {
    currentUserRequest,
    allRequests,
    requestsLoading,
    requestAdminRole,
    approveRequest,
    rejectRequest,
    hasPendingRequest: currentUserRequest?.status === "pending",
  };
}
