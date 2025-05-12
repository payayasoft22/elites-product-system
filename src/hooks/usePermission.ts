
import { useQuery } from "@tanstack/react-query";
import { supabase, PermissionAction } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";

export function usePermission() {
  const { user } = useAuth();

  // Fetch all role permissions from the database
  const { data: rolePermissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ["role_permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("*");
      
      if (error) {
        console.error("Error fetching permissions:", error);
        throw error;
      }
      
      return data;
    },
    enabled: !!user,
  });

  // Fetch the current user's role
  const { data: userRole, isLoading: roleLoading } = useQuery({
    queryKey: ["user_role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      
      if (error) {
        console.error("Error fetching user role:", error);
        throw error;
      }
      
      return data?.role;
    },
    enabled: !!user,
  });

  // Determine if the user is an admin
  const isAdmin = useMemo(() => {
    return userRole === "admin";
  }, [userRole]);

  // Check if a user has permission for a specific action
  const can = (action: PermissionAction): boolean => {
    // Admin can do everything
    if (isAdmin) return true;
    
    // If permissions or role not loaded yet, deny by default
    if (!rolePermissions || !userRole) return false;
    
    // Find the permission for the user's role and the requested action
    const permission = rolePermissions.find(
      p => p.role === userRole && p.action === action
    );
    
    // Return whether the action is allowed (default to false if not found)
    return !!permission?.allowed;
  };

  const isLoading = permissionsLoading || roleLoading;

  return {
    isAdmin,
    can,
    userRole,
    isLoading,
  };
}
