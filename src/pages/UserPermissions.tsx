
import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface User {
  id: string;
  email: string;
  display_name?: string;
  role?: string;
  permissions: {
    addProduct: boolean;
    editProduct: boolean;
    deleteProduct: boolean;
    addPriceHistory: boolean;
    deletePriceHistory: boolean;
    editPriceHistory: boolean;
  };
}

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

      setUsers((data || []).map(user => ({
        ...user,
        permissions: user.permissions || {
          addProduct: false,
          editProduct: false,
          deleteProduct: false,
          addPriceHistory: false,
          deletePriceHistory: false,
          editPriceHistory: false,
        },
      })));
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

  const updatePermission = async (userId: string, permissionType: string, value: boolean) => {
    try {
      // Optimistic UI update
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId
            ? {
                ...user,
                permissions: {
                  ...user.permissions,
                  [permissionType]: value,
                },
              }
            : user
        )
      );

      // Database update
      const userToUpdate = users.find(u => u.id === userId);
      if (!userToUpdate) return;

      const updatedPermissions = {
        ...userToUpdate.permissions,
        [permissionType]: value
      };

      const { error } = await supabase
        .from('profiles')
        .update({ permissions: updatedPermissions })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Permission updated for ${userToUpdate.display_name || userToUpdate.email}`,
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
                      <TableCell className="font-medium">
                        {user.display_name || 'Unknown'}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-md text-sm ${
                          user.role === 'admin' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-secondary text-secondary-foreground'
                        }`}>
                          {user.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {user.role === 'admin' ? (
                          <div className="text-muted-foreground text-sm">
                            Admin has full permissions
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <h4 className="font-medium">Products</h4>
                              <PermissionSwitch
                                label="Add"
                                checked={user.permissions.addProduct}
                                onCheckedChange={(checked) => 
                                  updatePermission(user.id, 'addProduct', checked)
                                }
                                disabled={currentUser.role !== 'admin'}
                              />
                              <PermissionSwitch
                                label="Edit"
                                checked={user.permissions.editProduct}
                                onCheckedChange={(checked) => 
                                  updatePermission(user.id, 'editProduct', checked)
                                }
                                disabled={currentUser.role !== 'admin'}
                              />
                              <PermissionSwitch
                                label="Delete"
                                checked={user.permissions.deleteProduct}
                                onCheckedChange={(checked) => 
                                  updatePermission(user.id, 'deleteProduct', checked)
                                }
                                disabled={currentUser.role !== 'admin'}
                              />
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-medium">Price History</h4>
                              <PermissionSwitch
                                label="Add"
                                checked={user.permissions.addPriceHistory}
                                onCheckedChange={(checked) => 
                                  updatePermission(user.id, 'addPriceHistory', checked)
                                }
                                disabled={currentUser.role !== 'admin'}
                              />
                              <PermissionSwitch
                                label="Edit"
                                checked={user.permissions.editPriceHistory}
                                onCheckedChange={(checked) => 
                                  updatePermission(user.id, 'editPriceHistory', checked)
                                }
                                disabled={currentUser.role !== 'admin'}
                              />
                              <PermissionSwitch
                                label="Delete"
                                checked={user.permissions.deletePriceHistory}
                                onCheckedChange={(checked) => 
                                  updatePermission(user.id, 'deletePriceHistory', checked)
                                }
                                disabled={currentUser.role !== 'admin'}
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

// Helper component for consistent switch styling
const PermissionSwitch = ({
  label,
  checked,
  onCheckedChange,
  disabled
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) => (
  <div className="flex items-center justify-between">
    <span>{label}</span>
    <Switch
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
    />
  </div>
);

export default UserPermissions;