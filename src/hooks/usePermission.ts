
import { useQuery } from "@tanstack/react-query";
import { supabase, PermissionAction } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";

export function usePermission() {
  const { user } = useAuth();

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

  const isAdmin = useMemo(() => {
    return userRole === "admin";
  }, [userRole]);

  const can = (action: PermissionAction): boolean => {
    // Admin can do everything
    if (isAdmin) return true;
    
    if (!rolePermissions || !userRole) return false;
    
    const permission = rolePermissions.find(
      p => p.role === userRole && p.action === action
    );
    
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
