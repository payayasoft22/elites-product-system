import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";

// Define permission actions as const for type safety
export const PermissionActions = {
  VIEW_DASHBOARD: "view_dashboard",
  MANAGE_PRODUCTS: "manage_products",
  MANAGE_USERS: "manage_users",
  MANAGE_SETTINGS: "manage_settings",
  REQUEST_ADMIN: "request_admin",
} as const;

export type PermissionAction = keyof typeof PermissionActions;

export function usePermission() {
  const { user } = useAuth();

  // Initialize permissions if they don't exist
  const { data: initialized } = useQuery({
    queryKey: ["initialize_permissions"],
    queryFn: async () => {
      // Check if permissions exist
      const { data: existingPermissions, error: checkError } = await supabase
        .from("role_permissions")
        .select("*")
        .limit(1);

      if (checkError) throw checkError;

      // If no permissions exist, initialize them
      if (!existingPermissions || existingPermissions.length === 0) {
        const defaultPermissions = [
          // Admin permissions
          { role: "admin", action: PermissionActions.VIEW_DASHBOARD, allowed: true },
          { role: "admin", action: PermissionActions.MANAGE_PRODUCTS, allowed: true },
          { role: "admin", action: PermissionActions.MANAGE_USERS, allowed: true },
          { role: "admin", action: PermissionActions.MANAGE_SETTINGS, allowed: true },
          { role: "admin", action: PermissionActions.REQUEST_ADMIN, allowed: true },
          
          // User permissions
          { role: "user", action: PermissionActions.VIEW_DASHBOARD, allowed: true },
          { role: "user", action: PermissionActions.MANAGE_PRODUCTS, allowed: false },
          { role: "user", action: PermissionActions.MANAGE_USERS, allowed: false },
          { role: "user", action: PermissionActions.MANAGE_SETTINGS, allowed: false },
          { role: "user", action: PermissionActions.REQUEST_ADMIN, allowed: true },
        ];

        const { error: insertError } = await supabase
          .from("role_permissions")
          .insert(defaultPermissions);

        if (insertError) throw insertError;
        return true;
      }
      return true;
    },
    staleTime: Infinity, // Only run once
  });

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
    enabled: !!user && !!initialized,
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
    PermissionActions, // Export actions for easy access
  };
}
