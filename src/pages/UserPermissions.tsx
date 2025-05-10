
import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { PermissionAction } from "@/integrations/supabase/client";

// Define types for permissions data
interface Permission {
  id: string;
  role: "user" | "admin";
  action: PermissionAction;
  allowed: boolean;
  created_at?: string;
}

const UserPermissions = () => {
  const [permissionsData, setPermissionsData] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Group permissions by role for easier display
  const permissionsByRole = permissionsData.reduce((acc, permission) => {
    if (!acc[permission.role]) {
      acc[permission.role] = [];
    }
    acc[permission.role].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .order('role', { ascending: true })
        .order('action', { ascending: true });

      if (error) throw error;
      setPermissionsData(data);
    } catch (error: any) {
      console.error('Error fetching permissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load permission settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePermission = async (permission: Permission, allowed: boolean) => {
    try {
      // Make a type-safe update by explicitly defining the role type
      const roleValue: "user" | "admin" = permission.role as "user" | "admin";
      
      const { error } = await supabase
        .from('role_permissions')
        .update({ allowed })
        .eq('id', permission.id);

      if (error) throw error;

      // Update local state
      setPermissionsData(prevPermissions =>
        prevPermissions.map(p => (p.id === permission.id ? { ...p, allowed } : p))
      );

      toast({
        title: 'Permission Updated',
        description: `${permission.action} permission has been ${allowed ? 'enabled' : 'disabled'} for ${permission.role} role.`,
      });
    } catch (error: any) {
      console.error('Error updating permission:', error);
      toast({
        title: 'Error',
        description: 'Failed to update permission',
        variant: 'destructive',
      });
    }
  };

  const getActionDisplayName = (action: string): string => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (!user) {
    return <div>Loading user information...</div>;
  }

  return (
    <DashboardLayout>
      <Helmet>
        <title>User Permissions | Price Paladin</title>
      </Helmet>
      
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">User Permissions</h2>
          <p className="text-muted-foreground">
            Configure what actions different user roles can perform.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center p-6">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {Object.entries(permissionsByRole).map(([role, permissions]) => (
              <Card key={role} className="overflow-hidden">
                <CardHeader className={role === 'admin' ? 'bg-primary/10' : 'bg-muted/50'}>
                  <CardTitle className="capitalize">{role} Permissions</CardTitle>
                  <CardDescription>
                    {role === 'admin' ? 
                      'Administrator privileges and capabilities' : 
                      'Default permissions for regular users'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="divide-y">
                    {permissions.map((permission) => (
                      <li key={permission.id} className="flex items-center justify-between p-4">
                        <span className="font-medium">{getActionDisplayName(permission.action)}</span>
                        <Switch
                          checked={permission.allowed}
                          onCheckedChange={(checked) => updatePermission(permission, checked)}
                        />
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default UserPermissions;
