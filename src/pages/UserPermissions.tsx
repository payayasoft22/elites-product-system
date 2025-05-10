
import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, PermissionAction } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { usePermission } from "@/hooks/usePermission";
import DashboardLayout from "@/components/DashboardLayout";

interface UserPermission {
  id?: string;
  user_id: string;
  action: PermissionAction;
  allowed: boolean;
}

interface UserProfile {
  id: string;
  name: string;
  role: string;
  email: string;
}

const UserPermissions = () => {
  const { isAdmin } = usePermission();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  
  // Fetch all users
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["users_for_permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, first_name, role")
        .eq("role", "user");
      
      if (error) throw error;
      
      return data.map(user => ({
        id: user.id,
        name: user.name || user.first_name || "Unknown",
        email: user.email || "Unknown",
        role: user.role
      })) as UserProfile[];
    },
    enabled: isAdmin,
  });

  // Fetch role permissions
  const { data: rolePermissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ["role_permissions_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("*");
      
      if (error) throw error;
      
      return data;
    },
    enabled: isAdmin,
  });

  // Update permission mutation
  const updatePermission = useMutation({
    mutationFn: async ({ role, action, allowed }: { role: string, action: PermissionAction, allowed: boolean }) => {
      const { error } = await supabase
        .from("role_permissions")
        .upsert(
          [{ role, action, allowed }], 
          { onConflict: "role,action" }
        );
      
      if (error) throw error;
      
      return { role, action, allowed };
    },
    onSuccess: () => {
      toast({
        title: "Permission updated",
        description: "User permission has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["role_permissions"] });
      queryClient.invalidateQueries({ queryKey: ["role_permissions_all"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Check if a permission is allowed
  const isPermissionAllowed = (role: string, action: PermissionAction) => {
    if (!rolePermissions) return false;
    
    const permission = rolePermissions.find(
      p => p.role === role && p.action === action
    );
    
    return permission?.allowed || false;
  };

  // Handle toggle permission
  const handleTogglePermission = (role: string, action: PermissionAction) => {
    const currentValue = isPermissionAllowed(role, action);
    updatePermission.mutate({ 
      role, 
      action, 
      allowed: !currentValue 
    });
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-96">
          <p className="text-xl text-muted-foreground">You do not have permission to view this page.</p>
        </div>
      </DashboardLayout>
    );
  }

  const isLoading = usersLoading || permissionsLoading;
  const permissionTypes: PermissionAction[] = [
    'add_product',
    'edit_product',
    'delete_product',
    'add_price_history',
    'edit_price_history',
    'delete_price_history'
  ];

  return (
    <DashboardLayout>
      <Helmet>
        <title>User Permissions | Price Paladin</title>
      </Helmet>

      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">User Permissions</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Manage User Permissions</CardTitle>
            <CardDescription>
              Configure what regular users can do in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Permission</TableHead>
                    <TableHead className="text-right">Allowed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissionTypes.map((action) => (
                    <TableRow key={action}>
                      <TableCell className="font-medium">
                        {action.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}
                      </TableCell>
                      <TableCell className="text-right">
                        <Switch
                          checked={isPermissionAllowed('user', action)}
                          onCheckedChange={() => handleTogglePermission('user', action)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="mt-6 text-sm text-muted-foreground">
              <p>Note: Admin users always have all permissions enabled.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default UserPermissions;
