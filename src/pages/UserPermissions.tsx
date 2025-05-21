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

const UserPermissionsPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, display_name, role, permissions')
          .order('display_name', { ascending: true });

        if (error) throw error;

        const nonAdminUsers = (data || [])
          .filter(user => user.role !== 'admin')
          .map(user => ({
            ...user,
            permissions: {
              ...defaultPermissions,
              ...(user.permissions || {})
            },
          }));

        setUsers(nonAdminUsers);
      } catch (error: any) {
        console.error('Failed to load users:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to load users',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [toast]);

  const handlePermissionToggle = async (userId: string, permission: keyof UserPermissions, value: boolean) => {
    if (!currentUser || currentUser.role !== 'admin') {
      toast({
        title: 'Permission Denied',
        description: 'Only administrators can modify permissions',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Optimistic update
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId
            ? {
                ...user,
                permissions: {
                  ...user.permissions,
                  [permission]: value,
                },
              }
            : user
        )
      );

      // Find the user to update
      const userToUpdate = users.find(u => u.id === userId);
      if (!userToUpdate) return;

      // Prepare updated permissions
      const updatedPermissions = {
        ...userToUpdate.permissions,
        [permission]: value,
      };

      // Update in database
      const { error } = await supabase
        .from('profiles')
        .update({ permissions: updatedPermissions })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Updated ${permission} permission`,
      });
    } catch (error: any) {
      console.error('Failed to update permission:', error);
      // Revert on error
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId
            ? {
                ...user,
                permissions: users.find(u => u.id === userId)?.permissions || defaultPermissions,
              }
            : user
        )
      );
      toast({
        title: 'Error',
        description: error.message || 'Failed to update permission',
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
        <title>User Permissions | Product Management</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">User Permissions</h1>
          <p className="text-muted-foreground">
            Manage permissions for non-admin users
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User List</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-6">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">
                No non-admin users found
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Product Permissions</TableHead>
                    <TableHead>Price History Permissions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.display_name || 'Unknown'}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <div className="space-y-3">
                          <PermissionToggle
                            label="Add Products"
                            checked={user.permissions.addProduct}
                            onCheckedChange={(checked) =>
                              handlePermissionToggle(user.id, 'addProduct', checked)
                            }
                            disabled={currentUser.role !== 'admin'}
                          />
                          <PermissionToggle
                            label="Edit Products"
                            checked={user.permissions.editProduct}
                            onCheckedChange={(checked) =>
                              handlePermissionToggle(user.id, 'editProduct', checked)
                            }
                            disabled={currentUser.role !== 'admin'}
                          />
                          <PermissionToggle
                            label="Delete Products"
                            checked={user.permissions.deleteProduct}
                            onCheckedChange={(checked) =>
                              handlePermissionToggle(user.id, 'deleteProduct', checked)
                            }
                            disabled={currentUser.role !== 'admin'}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-3">
                          <PermissionToggle
                            label="Add Price History"
                            checked={user.permissions.addPriceHistory}
                            onCheckedChange={(checked) =>
                              handlePermissionToggle(user.id, 'addPriceHistory', checked)
                            }
                            disabled={currentUser.role !== 'admin'}
                          />
                          <PermissionToggle
                            label="Edit Price History"
                            checked={user.permissions.editPriceHistory}
                            onCheckedChange={(checked) =>
                              handlePermissionToggle(user.id, 'editPriceHistory', checked)
                            }
                            disabled={currentUser.role !== 'admin'}
                          />
                          <PermissionToggle
                            label="Delete Price History"
                            checked={user.permissions.deletePriceHistory}
                            onCheckedChange={(checked) =>
                              handlePermissionToggle(user.id, 'deletePriceHistory', checked)
                            }
                            disabled={currentUser.role !== 'admin'}
                          />
                        </div>
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

const PermissionToggle = ({
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
  <div className="flex items-center justify-between">
    <span className="text-sm font-medium">{label}</span>
    <Switch
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-300"
    />
  </div>
);

export default UserPermissions;