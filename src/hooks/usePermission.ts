// src/hooks/usePermission.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo, useEffect } from "react";

export const PermissionActions = {
  VIEW_DASHBOARD: "VIEW_DASHBOARD",
  MANAGE_PRODUCTS: "MANAGE_PRODUCTS",
  MANAGE_USERS: "MANAGE_USERS",
  MANAGE_SETTINGS: "MANAGE_SETTINGS",
  REQUEST_ADMIN: "REQUEST_ADMIN",
  ADD_PRODUCT: "ADD_PRODUCT",
  EDIT_PRODUCT: "EDIT_PRODUCT",
  DELETE_PRODUCT: "DELETE_PRODUCT",
  ADD_PRICE_HISTORY: "ADD_PRICE_HISTORY",
  EDIT_PRICE_HISTORY: "EDIT_PRICE_HISTORY",
  DELETE_PRICE_HISTORY: "DELETE_PRICE_HISTORY",
} as const;

export type PermissionAction = keyof typeof PermissionActions;

export function usePermission() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
    
    // Check custom permissions (from profiles.permissions)
    if (userData?.permissions?.[action] !== undefined) {
      return userData.permissions[action];
    }
    
    // Default to false if no permission is found
    return false;
  };

  const isLoading = roleLoading;

  return {
    isAdmin,
    can,
    userRole: userData?.role,
    isLoading,
    PermissionActions,
    canAddProduct: can("ADD_PRODUCT"),
    canEditProduct: can("EDIT_PRODUCT"),
    canDeleteProduct: can("DELETE_PRODUCT"),
    canAddPriceHistory: can("ADD_PRICE_HISTORY"),
    canEditPriceHistory: can("EDIT_PRICE_HISTORY"),
    canDeletePriceHistory: can("DELETE_PRICE_HISTORY"),
    refreshPermissions: () => {
      queryClient.invalidateQueries(['user_permissions', user?.id]);
    }
  };
}
