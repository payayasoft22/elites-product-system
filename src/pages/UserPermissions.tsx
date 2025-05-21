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
  const { user } = useAuth();

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

      const usersWithDefaults = (data || []).map(user => ({
        ...user,
        permissions: user.permissions || {
          addProduct: false,
          editProduct: false,
          deleteProduct: false,
          addPriceHistory: false,
          deletePriceHistory: false,
          editPriceHistory: false,
        },
      }));

      setUsers(usersWithDefaults);
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
      // Find the user to update
      const userToUpdate = users.find(u => u.id === userId);
      if (!userToUpdate) return;

      // Admins cannot have their permissions changed
      if (userToUpdate.role === 'admin') {
        toast({
          title: 'Cannot modify admin permissions',
          description: 'Admin users have all permissions by default',
          variant: 'default',
        });
        return;
      }

      // Update permissions locally first for instant UI feedback
      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.id === userId
            ? {
                ...u,
                permissions: {
                  ...u.permissions,
                  [permissionType]: value,
                },
              }
            : u
        )
      );

      // Update permissions in the database
      const { error } = await supabase
        .from('profiles')
        .update({ 
          permissions: {
            ...userToUpdate.permissions,
            [permissionType]: value
          }
        })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'Permission Updated',
        description: `Updated ${permissionType} permission for ${userToUpdate.display_name || userToUpdate.email}.`,
      });
    } catch (error: any) {
      console.error('Error updating permission:', error);
      // Revert local changes if update fails
      fetchUsers();
      toast({
        title: 'Error',
        description: 'Failed to update permission',
        variant: 'destructive',
      });
    }
  };

  if (!user) {
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
        <title>User Management | Elites Product Management</title>
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
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <span>Add Product</span>
                              <Switch
                                checked={user.permissions.addProduct}
                                onCheckedChange={checked => updatePermission(user.id, 'addProduct', checked)}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span>Edit Product</span>
                              <Switch
                                checked={user.permissions.editProduct}
                                onCheckedChange={checked => updatePermission(user.id, 'editProduct', checked)}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span>Delete Product</span>
                              <Switch
                                checked={user.permissions.deleteProduct}
                                onCheckedChange={checked => updatePermission(user.id, 'deleteProduct', checked)}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span>Add Price History</span>
                              <Switch
                                checked={user.permissions.addPriceHistory}
                                onCheckedChange={checked => updatePermission(user.id, 'addPriceHistory', checked)}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span>Delete Price History</span>
                              <Switch
                                checked={user.permissions.deletePriceHistory}
                                onCheckedChange={checked => updatePermission(user.id, 'deletePriceHistory', checked)}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span>Edit Price History</span>
                              <Switch
                                checked={user.permissions.editPriceHistory}
                                onCheckedChange={checked => updatePermission(user.id, 'editPriceHistory', checked)}
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

export default UserPermissions;