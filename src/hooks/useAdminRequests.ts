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
  display_name?: string;
  email?: string;
}

export function useAdminRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: currentUserRequest, error: currentUserRequestError } = useQuery({
    queryKey: ["admin_requests", "current_user"],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("admin_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("requested_at", { ascending: false })
        .limit(1);
      
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!user,
  });

  const { data: allRequests, isLoading: requestsLoading, error: allRequestsError } = useQuery({
    queryKey: ["admin_requests", "all"],
    queryFn: async () => {
      const { data: requestsData, error: requestsError } = await supabase
        .from("admin_requests")
        .select("*")
        .order("requested_at", { ascending: false });
      
      if (requestsError) throw requestsError;

      const userIds = requestsData.map(req => req.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", userIds);
      
      if (profilesError) throw profilesError;

      return requestsData.map(req => {
        const profile = profilesData.find(p => p.id === req.user_id);
        return {
          ...req,
          display_name: profile?.display_name || "Unknown",
          email: profile?.email || "Unknown"
        };
      });
    },
    enabled: !!user,
  });

  const requestAdminRole = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("No user ID available");
      
      const { data: existing, error: checkError } = await supabase
        .from("admin_requests")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending");
      
      if (checkError) throw checkError;
      if (existing?.length) throw new Error("You already have a pending request");
      
      const { error } = await supabase
        .from("admin_requests")
        .insert([{ 
          user_id: user.id,
          status: "pending",
          requested_at: new Date().toISOString()
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Request submitted",
        description: "Your admin request has been submitted.",
      });
      queryClient.invalidateQueries(["admin_requests"]);
    },
    onError: (error: Error) => {
      toast({
        title: "Request failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const approveRequest = useMutation({
    mutationFn: async ({ requestId, userId }: { requestId: string; userId: string }) => {
      if (!user?.id) throw new Error("No admin user ID available");
      
      const { error: requestError } = await supabase
        .from("admin_requests")
        .update({
          status: "approved",
          resolved_at: new Date().toISOString(),
          resolved_by: user.id
        })
        .eq("id", requestId);
      
      if (requestError) throw requestError;
      
      const { error: roleError } = await supabase
        .from("profiles")
        .update({ role: "admin" })
        .eq("id", userId);
      
      if (roleError) throw roleError;
    },
    onSuccess: () => {
      toast({
        title: "Request approved",
        description: "The user has been granted admin privileges.",
      });
      queryClient.invalidateQueries(["admin_requests"]);
      queryClient.invalidateQueries(["users"]);
    },
    onError: (error: Error) => {
      toast({
        title: "Approval failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectRequest = useMutation({
    mutationFn: async (requestId: string) => {
      if (!user?.id) throw new Error("No admin user ID available");
      
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
      queryClient.invalidateQueries(["admin_requests"]);
    },
    onError: (error: Error) => {
      toast({
        title: "Rejection failed",
        description: error.message,
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
    error: currentUserRequestError || allRequestsError
  };
}
