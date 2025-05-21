import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { PermissionActions, usePermission } from "@/hooks/usePermission";

interface User {
  id: string;
  email: string;
  display_name?: string;
  role?: string;
  permissions: Record<string, boolean>;
}

const UserPermissions = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const { isAdmin, refreshPermissions } = usePermission();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, display_name, role, permissions')
        .order('display_name', { ascending: true });

      if (error) throw error;

      const formattedUsers = (data || []).map(user => ({
        ...user,
        permissions: user.permissions || {},
      }));

      setUsers(formattedUsers);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: `Failed to load users: ${error.message || error}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = async (userId: string, permissionType: keyof typeof PermissionActions, newValue: boolean) => {
    try {
      // Find the user to update
      const userToUpdate = users.find(u => u.id === userId);
      if (!userToUpdate) return;

      // Block permission changes for admins
      if (userToUpdate.role === 'admin') {
        toast({
          title: 'Cannot modify admin permissions',
          description: 'Admin users have all permissions by default',
          variant: 'default',
        });
        return;
      }

      // Optimistic UI update
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId
            ? {
                ...user,
                permissions: {
                  ...user.permissions,
                  [permissionType]: newValue,
                },
              }
            : user
        )
      );

      // Prepare updated permissions
      const updatedPermissions = {
        ...userToUpdate.permissions,
        [permissionType]: newValue
      };

      // Update in database
      const { error } = await supabase
        .from('profiles')
        .update({ permissions: updatedPermissions })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Updated ${permissionType} permission`,
      });

      // Refresh permissions in other components
      refreshPermissions();
    } catch (error: any) {
      console.error('Update failed:', error);
      // Revert on error
      fetchUsers();
      toast({
        title: 'Error',
        description: 'Failed to update permission',
        variant: 'destructive',
      });
    }
  };

  if (!currentUser) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center min-h-[300px]">
          <p>Loading user information...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Helmet>
        <title>User Management | Product Management</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground">Manage user permissions</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-6">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Permissions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(user => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.display_name || 'Unknown'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.role === 'admin' ? (
                          <span className="px-2 py-1 bg-primary text-primary-foreground rounded-md text-sm">
                            Admin
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                            User
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.role === 'admin' ? (
                          <div className="text-muted-foreground text-sm">
                            Admin has all permissions
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <h4 className="font-medium">Products</h4>
                              <PermissionSwitch
                                label="Add"
                                checked={user.permissions[PermissionActions.ADD_PRODUCT] || false}
                                onCheckedChange={(checked) => 
                                  handlePermissionChange(user.id, 'ADD_PRODUCT', checked)
                                }
                              />
                              <PermissionSwitch
                                label="Edit"
                                checked={user.permissions[PermissionActions.EDIT_PRODUCT] || false}
                                onCheckedChange={(checked) => 
                                  handlePermissionChange(user.id, 'EDIT_PRODUCT', checked)
                                }
                              />
                              <PermissionSwitch
                                label="Delete"
                                checked={user.permissions[PermissionActions.DELETE_PRODUCT] || false}
                                onCheckedChange={(checked) => 
                                  handlePermissionChange(user.id, 'DELETE_PRODUCT', checked)
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-medium">Price History</h4>
                              <PermissionSwitch
                                label="Add"
                                checked={user.permissions[PermissionActions.ADD_PRICE_HISTORY] || false}
                                onCheckedChange={(checked) => 
                                  handlePermissionChange(user.id, 'ADD_PRICE_HISTORY', checked)
                                }
                              />
                              <PermissionSwitch
                                label="Edit"
                                checked={user.permissions[PermissionActions.EDIT_PRICE_HISTORY] || false}
                                onCheckedChange={(checked) => 
                                  handlePermissionChange(user.id, 'EDIT_PRICE_HISTORY', checked)
                                }
                              />
                              <PermissionSwitch
                                label="Delete"
                                checked={user.permissions[PermissionActions.DELETE_PRICE_HISTORY] || false}
                                onCheckedChange={(checked) => 
                                  handlePermissionChange(user.id, 'DELETE_PRICE_HISTORY', checked)
                                }
                              />
                            </div>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

const PermissionSwitch = ({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) => (
  <div className="flex items-center justify-between">
    <span className="text-sm">{label}</span>
    <Switch
      checked={checked}
      onCheckedChange={onCheckedChange}
      className="data-[state=checked]:bg-green-500"
    />
  </div>
);

export default UserPermissions;