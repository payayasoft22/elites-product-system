import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo, useEffect } from "react";

// Define permission actions as const for type safety
export const PermissionActions = {
  VIEW_DASHBOARD: "view_dashboard",
  MANAGE_PRODUCTS: "manage_products",
  MANAGE_USERS: "manage_users",
  MANAGE_SETTINGS: "manage_settings",
  REQUEST_ADMIN: "request_admin",
  
  // Product-specific permissions
  ADD_PRODUCT: "add_product",
  EDIT_PRODUCT: "edit_product",
  DELETE_PRODUCT: "delete_product",
  ADD_PRICE_HISTORY: "add_price_history",
  EDIT_PRICE_HISTORY: "edit_price_history",
  DELETE_PRICE_HISTORY: "delete_price_history",
} as const;

export type PermissionAction = keyof typeof PermissionActions;

export function usePermission() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
          // Admin permissions - has all permissions
          { role: "admin", action: PermissionActions.VIEW_DASHBOARD, allowed: true },
          { role: "admin", action: PermissionActions.MANAGE_PRODUCTS, allowed: true },
          { role: "admin", action: PermissionActions.MANAGE_USERS, allowed: true },
          { role: "admin", action: PermissionActions.MANAGE_SETTINGS, allowed: true },
          { role: "admin", action: PermissionActions.REQUEST_ADMIN, allowed: true },
          { role: "admin", action: PermissionActions.ADD_PRODUCT, allowed: true },
          { role: "admin", action: PermissionActions.EDIT_PRODUCT, allowed: true },
          { role: "admin", action: PermissionActions.DELETE_PRODUCT, allowed: true },
          { role: "admin", action: PermissionActions.ADD_PRICE_HISTORY, allowed: true },
          { role: "admin", action: PermissionActions.EDIT_PRICE_HISTORY, allowed: true },
          { role: "admin", action: PermissionActions.DELETE_PRICE_HISTORY, allowed: true },
          
          // Default user permissions
          { role: "user", action: PermissionActions.VIEW_DASHBOARD, allowed: true },
          { role: "user", action: PermissionActions.MANAGE_PRODUCTS, allowed: false },
          { role: "user", action: PermissionActions.MANAGE_USERS, allowed: false },
          { role: "user", action: PermissionActions.MANAGE_SETTINGS, allowed: false },
          { role: "user", action: PermissionActions.REQUEST_ADMIN, allowed: true },
          { role: "user", action: PermissionActions.ADD_PRODUCT, allowed: false },
          { role: "user", action: PermissionActions.EDIT_PRODUCT, allowed: false },
          { role: "user", action: PermissionActions.DELETE_PRODUCT, allowed: false },
          { role: "user", action: PermissionActions.ADD_PRICE_HISTORY, allowed: false },
          { role: "user", action: PermissionActions.EDIT_PRICE_HISTORY, allowed: false },
          { role: "user", action: PermissionActions.DELETE_PRICE_HISTORY, allowed: false },
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

  // Fetch all role permissions
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

  // Fetch user's role and custom permissions
  const { data: userData, isLoading: roleLoading } = useQuery({
    queryKey: ["user_permissions", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("role, permissions")
        .eq("id", user.id)
        .single();
      
      if (error) {
        console.error("Error fetching user role:", error);
        throw error;
      }
      
      return data;
    },
    enabled: !!user,
  });

  // Set up real-time subscription for permission changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`user_permission_changes_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        () => {
          queryClient.invalidateQueries(['user_permissions', user.id]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const isAdmin = useMemo(() => {
    return userData?.role === "admin";
  }, [userData]);

  const can = (action: PermissionAction): boolean => {
    // Admin can do everything
    if (isAdmin) return true;
    
    // Check custom permissions first (from profiles.permissions)
    if (userData?.permissions?.[action] !== undefined) {
      return userData.permissions[action];
    }
    
    // Fall back to role-based permissions
    if (!rolePermissions || !userData?.role) return false;
    
    const permission = rolePermissions.find(
      p => p.role === userData.role && p.action === PermissionActions[action]
    );
    
    return !!permission?.allowed;
  };

  const isLoading = permissionsLoading || roleLoading;

  return {
    isAdmin,
    can,
    userRole: userData?.role,
    isLoading,
    PermissionActions,
    // Convenience methods for product permissions
    canAddProduct: can("ADD_PRODUCT"),
    canEditProduct: can("EDIT_PRODUCT"),
    canDeleteProduct: can("DELETE_PRODUCT"),
    canAddPriceHistory: can("ADD_PRICE_HISTORY"),
    canEditPriceHistory: can("EDIT_PRICE_HISTORY"),
    canDeletePriceHistory: can("DELETE_PRICE_HISTORY"),
    refreshPermissions: () => {
      queryClient.invalidateQueries(['user_permissions', user?.id]);
      queryClient.invalidateQueries(['role_permissions']);
    }
  };
}