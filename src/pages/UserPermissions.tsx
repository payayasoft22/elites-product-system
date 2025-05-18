import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface User {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
}

interface UserPermission {
  user_id: string;
  action: string;
  allowed: boolean;
}

const UserPermissions = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingPermissions, setUpdatingPermissions] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  useEffect(() => {
    fetchUsers();
    fetchUserPermissions();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, name, role')
        .order('name', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*');

      if (error) throw error;
      setUserPermissions(data || []);
    } catch (error: any) {
      console.error('Error fetching user permissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user permissions',
        variant: 'destructive',
      });
    }
  };

  const updateUserPermission = async (userId: string, action: string, allowed: boolean) => {
    const permissionKey = `${userId}-${action}`;
    try {
      setUpdatingPermissions(prev => ({ ...prev, [permissionKey]: true }));
      
      // Check if permission exists
      const existingPermission = userPermissions.find(
        p => p.user_id === userId && p.action === action
      );

      if (existingPermission) {
        // Update existing permission
        const { error } = await supabase
          .from('user_permissions')
          .update({ allowed })
          .eq('user_id', userId)
          .eq('action', action);

        if (error) throw error;
      } else {
        // Create new permission
        const { error } = await supabase
          .from('user_permissions')
          .insert({ user_id: userId, action, allowed });

        if (error) throw error;
      }

      // Update local state
      setUserPermissions(prev => {
        const existing = prev.find(p => p.user_id === userId && p.action === action);
        if (existing) {
          return prev.map(p => 
            p.user_id === userId && p.action === action ? { ...p, allowed } : p
          );
        } else {
          return [...prev, { user_id: userId, action, allowed }];
        }
      });

      toast({
        title: 'Success',
        description: `Permission updated for user`,
      });
    } catch (error: any) {
      console.error('Error updating permission:', error);
      toast({
        title: 'Error',
        description: 'Failed to update permission',
        variant: 'destructive',
      });
    } finally {
      setUpdatingPermissions(prev => ({ ...prev, [permissionKey]: false }));
    }
  };

  const getPermissionForUser = (userId: string, action: string): boolean => {
    // Admins have all permissions by default
    const user = users.find(u => u.id === userId);
    if (user?.role === 'admin') return true;
    
    const permission = userPermissions.find(p => p.user_id === userId && p.action === action);
    return permission ? permission.allowed : false;
  };

  const getActionDisplayName = (action: string): string => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const availableActions = [
    'create_products',
    'edit_products',
    'delete_products',
    'manage_users',
    'view_reports'
  ];

  const canManageUsers = currentUser?.role === 'admin' || 
    getPermissionForUser(currentUser?.id || '', 'manage_users');

  return (
    <DashboardLayout>
      <Helmet>
        <title>User Permissions | Admin Dashboard</title>
      </Helmet>
      
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">User Permissions</h2>
          <p className="text-muted-foreground">
            Manage individual user permissions and access controls
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Access Control</CardTitle>
            <CardDescription>
              Configure what actions each user can perform in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-6">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      {availableActions.map(action => (
                        <TableHead key={action} className="whitespace-nowrap">
                          {getActionDisplayName(action)}
                        </TableHead>
                      ))}
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(user => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="font-medium">{user.name || 'Unnamed User'}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        {availableActions.map(action => {
                          const permissionKey = `${user.id}-${action}`;
                          const isUpdating = updatingPermissions[permissionKey];
                          const hasPermission = getPermissionForUser(user.id, action);
                          
                          return (
                            <TableCell key={permissionKey}>
                              {isUpdating ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                                <Switch
                                  checked={hasPermission}
                                  onCheckedChange={(checked) => 
                                    updateUserPermission(user.id, action, checked)
                                  }
                                  disabled={
                                    // Don't allow modifying your own admin permissions
                                    (user.id === currentUser?.id && user.role === 'admin') ||
                                    // Only admins or users with manage_users permission can modify permissions
                                    !canManageUsers
                                  }
                                />
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => navigator.clipboard.writeText(user.id)}
                              >
                                Copy User ID
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => navigator.clipboard.writeText(user.email)}
                              >
                                Copy Email
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default UserPermissions;
