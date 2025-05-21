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
import { Loader2 } from "lucide-react";

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
      const userToUpdate = users.find(u => u.id === userId);
      if (!userToUpdate) return;

      if (currentUser?.role !== 'admin') {
        toast({
          title: 'Permission Denied',
          description: 'Only admins can modify permissions',
          variant: 'destructive',
        });
        return;
      }

      if (userToUpdate.role === 'admin') {
        toast({
          title: 'Cannot modify admin',
          description: 'Admin accounts have all permissions',
          variant: 'default',
        });
        return;
      }

      const updatedPermissions = {
        ...userToUpdate.permissions,
        [permissionType]: value
      };

      const { error } = await supabase
        .from('profiles')
        .update({ permissions: updatedPermissions })
        .eq('id', userId);

      if (error) throw error;

      setUsers(prevUsers =>
        prevUsers.map(u =>
          u.id === userId ? { ...u, permissions: updatedPermissions } : u
        )
      );

      toast({
        title: 'Success',
        description: `Updated ${permissionType} for ${userToUpdate.display_name || userToUpdate.email}`,
      });

    } catch (error: any) {
      console.error('Error updating permission:', error);
      toast({
        title: 'Error',
        description: 'Failed to update permission',
        variant: 'destructive',
      });
      fetchUsers();
    }
  };

  if (!currentUser) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Helmet>
        <title>User Management | Product System</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">User Permissions</h2>
            <p className="text-muted-foreground">Manage access controls</p>
          </div>
          <Button onClick={fetchUsers} variant="outline">
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Permission Controls</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Product Permissions</TableHead>
                    <TableHead>Price History Permissions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium">{user.display_name || 'No name'}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </TableCell>
                      <TableCell>
                        {user.role === 'admin' ? (
                          <span className="px-2 py-1 bg-primary text-primary-foreground rounded-md text-xs">
                            Admin
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-xs">
                            User
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={user.permissions.addProduct}
                              onCheckedChange={checked => updatePermission(user.id, 'addProduct', checked)}
                              disabled={currentUser.role !== 'admin'}
                            />
                            <span>Add Products</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={user.permissions.editProduct}
                              onCheckedChange={checked => updatePermission(user.id, 'editProduct', checked)}
                              disabled={currentUser.role !== 'admin'}
                            />
                            <span>Edit Products</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={user.permissions.deleteProduct}
                              onCheckedChange={checked => updatePermission(user.id, 'deleteProduct', checked)}
                              disabled={currentUser.role !== 'admin'}
                            />
                            <span>Delete Products</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={user.permissions.addPriceHistory}
                              onCheckedChange={checked => updatePermission(user.id, 'addPriceHistory', checked)}
                              disabled={currentUser.role !== 'admin'}
                            />
                            <span>Add Price History</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={user.permissions.editPriceHistory}
                              onCheckedChange={checked => updatePermission(user.id, 'editPriceHistory', checked)}
                              disabled={currentUser.role !== 'admin'}
                            />
                            <span>Edit Price History</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={user.permissions.deletePriceHistory}
                              onCheckedChange={checked => updatePermission(user.id, 'deletePriceHistory', checked)}
                              disabled={currentUser.role !== 'admin'}
                            />
                            <span>Delete Price History</span>
                          </div>
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

export default UserPermissions;