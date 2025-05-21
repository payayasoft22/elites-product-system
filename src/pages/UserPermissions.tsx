import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";

interface UserPermissions {
  addProduct: boolean;
  editProduct: boolean;
  deleteProduct: boolean;
  addPriceHistory: boolean;
  deletePriceHistory: boolean;
  editPriceHistory: boolean;
}

interface User {
  id: string;
  email: string;
  display_name?: string;
  role?: string;
  permissions: UserPermissions;
}

const defaultPermissions: UserPermissions = {
  addProduct: false,
  editProduct: false,
  deleteProduct: false,
  addPriceHistory: false,
  deletePriceHistory: false,
  editPriceHistory: false,
};

const UserPermissions = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

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
        permissions: {
          ...defaultPermissions,
          ...(user.permissions || {})
        },
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

  const handlePermissionChange = async (userId: string, permissionType: keyof UserPermissions, newValue: boolean) => {
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

      // Only allow admins to modify permissions
      if (currentUser?.role !== 'admin') {
        toast({
          title: 'Permission Denied',
          description: 'Only administrators can modify permissions',
          variant: 'destructive',
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
        description: `Updated ${permissionType} permission for ${userToUpdate.display_name || userToUpdate.email}`,
      });
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
          <p className="text-muted-foreground">Manage user permissions for product operations</p>
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
                    <TableHead>Product Permissions</TableHead>
                    <TableHead>Price History Permissions</TableHead>
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
                            Full permissions
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <PermissionSwitch
                              label="Add Products"
                              checked={user.permissions.addProduct}
                              onCheckedChange={(checked) => 
                                handlePermissionChange(user.id, 'addProduct', checked)
                              }
                              disabled={currentUser.role !== 'admin'}
                            />
                            <PermissionSwitch
                              label="Edit Products"
                              checked={user.permissions.editProduct}
                              onCheckedChange={(checked) => 
                                handlePermissionChange(user.id, 'editProduct', checked)
                              }
                              disabled={currentUser.role !== 'admin'}
                            />
                            <PermissionSwitch
                              label="Delete Products"
                              checked={user.permissions.deleteProduct}
                              onCheckedChange={(checked) => 
                                handlePermissionChange(user.id, 'deleteProduct', checked)
                              }
                              disabled={currentUser.role !== 'admin'}
                            />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.role === 'admin' ? (
                          <div className="text-muted-foreground text-sm">
                            Full permissions
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <PermissionSwitch
                              label="Add Price History"
                              checked={user.permissions.addPriceHistory}
                              onCheckedChange={(checked) => 
                                handlePermissionChange(user.id, 'addPriceHistory', checked)
                              }
                              disabled={currentUser.role !== 'admin'}
                            />
                            <PermissionSwitch
                              label="Edit Price History"
                              checked={user.permissions.editPriceHistory}
                              onCheckedChange={(checked) => 
                                handlePermissionChange(user.id, 'editPriceHistory', checked)
                              }
                              disabled={currentUser.role !== 'admin'}
                            />
                            <PermissionSwitch
                              label="Delete Price History"
                              checked={user.permissions.deletePriceHistory}
                              onCheckedChange={(checked) => 
                                handlePermissionChange(user.id, 'deletePriceHistory', checked)
                              }
                              disabled={currentUser.role !== 'admin'}
                            />
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
  disabled,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-sm">{label}</span>
    <Switch
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
    />
  </div>
);

export default UserPermissions;