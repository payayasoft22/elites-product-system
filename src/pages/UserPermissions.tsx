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
  const [updatingPermissions, setUpdatingPermissions] = useState<Record<string, boolean>>({});
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

  const refreshUserPermissions = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('permissions')
      .eq('id', userId)
      .single();
    
    return data?.permissions;
  };

  const updatePermission = async (userId: string, permissionType: string, value: boolean) => {
    try {
      setUpdatingPermissions(prev => ({ ...prev, [userId]: true }));
      
      const userToUpdate = users.find(u => u.id === userId);
      if (!userToUpdate) return;

      // Prevent non-admins from modifying permissions
      if (currentUser?.role !== 'admin') {
        toast({
          title: 'Permission Denied',
          description: 'Only admins can modify permissions',
          variant: 'destructive',
        });
        return;
      }

      // Prevent modifying admin permissions
      if (userToUpdate.role === 'admin') {
        toast({
          title: 'Cannot modify admin',
          description: 'Admin accounts have all permissions by default',
          variant: 'default',
        });
        return;
      }

      // Update in database
      const { error } = await supabase
        .from('profiles')
        .update({ 
          permissions: { ...userToUpdate.permissions, [permissionType]: value }
        })
        .eq('id', userId);

      if (error) throw error;

      // Force-refetch the updated permissions
      const updatedPermissions = await refreshUserPermissions(userId);
      if (!updatedPermissions) throw new Error("Failed to refresh permissions");

      // Update local state
      setUsers(prevUsers => prevUsers.map(u => 
        u.id === userId 
          ? { ...u, permissions: updatedPermissions } 
          : u
      ));

      toast({
        title: 'Success',
        description: `Updated ${permissionType} for ${userToUpdate.display_name || userToUpdate.email}`,
      });

      // Broadcast permission change to all tabs
      if (typeof window !== 'undefined' && window.BroadcastChannel) {
        const channel = new BroadcastChannel('permission_updates');
        channel.postMessage({ userId, permissions: updatedPermissions });
      }

    } catch (error: any) {
      console.error('Error updating permission:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update permission',
        variant: 'destructive',
      });
      // Revert UI if update fails
      fetchUsers();
    } finally {
      setUpdatingPermissions(prev => ({ ...prev, [userId]: false }));
    }
  };

  // Listen for permission updates from other tabs
  useEffect(() => {
    if (typeof window === 'undefined' || !window.BroadcastChannel) return;

    const channel = new BroadcastChannel('permission_updates');
    channel.onmessage = (event) => {
      const { userId, permissions } = event.data;
      setUsers(prevUsers => prevUsers.map(u => 
        u.id === userId ? { ...u, permissions } : u
      ));
    };

    return () => channel.close();
  }, []);

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
            <p className="text-muted-foreground">Manage what users can access</p>
          </div>
          <Button onClick={fetchUsers} variant="outline">
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Access Control</CardTitle>
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
                    <TableHead className="w-[400px]">Product Permissions</TableHead>
                    <TableHead className="w-[400px]">Price History Permissions</TableHead>
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
                              id={`${user.id}-addProduct`}
                              checked={user.permissions.addProduct}
                              onCheckedChange={checked => updatePermission(user.id, 'addProduct', checked)}
                              disabled={currentUser.role !== 'admin' || user.role === 'admin' || updatingPermissions[user.id]}
                            />
                            <Label htmlFor={`${user.id}-addProduct`}>Add Products</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`${user.id}-editProduct`}
                              checked={user.permissions.editProduct}
                              onCheckedChange={checked => updatePermission(user.id, 'editProduct', checked)}
                              disabled={currentUser.role !== 'admin' || user.role === 'admin' || updatingPermissions[user.id]}
                            />
                            <Label htmlFor={`${user.id}-editProduct`}>Edit Products</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`${user.id}-deleteProduct`}
                              checked={user.permissions.deleteProduct}
                              onCheckedChange={checked => updatePermission(user.id, 'deleteProduct', checked)}
                              disabled={currentUser.role !== 'admin' || user.role === 'admin' || updatingPermissions[user.id]}
                            />
                            <Label htmlFor={`${user.id}-deleteProduct`}>Delete Products</Label>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`${user.id}-addPriceHistory`}
                              checked={user.permissions.addPriceHistory}
                              onCheckedChange={checked => updatePermission(user.id, 'addPriceHistory', checked)}
                              disabled={currentUser.role !== 'admin' || user.role === 'admin' || updatingPermissions[user.id]}
                            />
                            <Label htmlFor={`${user.id}-addPriceHistory`}>Add Price History</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`${user.id}-editPriceHistory`}
                              checked={user.permissions.editPriceHistory}
                              onCheckedChange={checked => updatePermission(user.id, 'editPriceHistory', checked)}
                              disabled={currentUser.role !== 'admin' || user.role === 'admin' || updatingPermissions[user.id]}
                            />
                            <Label htmlFor={`${user.id}-editPriceHistory`}>Edit Price History</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`${user.id}-deletePriceHistory`}
                              checked={user.permissions.deletePriceHistory}
                              onCheckedChange={checked => updatePermission(user.id, 'deletePriceHistory', checked)}
                              disabled={currentUser.role !== 'admin' || user.role === 'admin' || updatingPermissions[user.id]}
                            />
                            <Label htmlFor={`${user.id}-deletePriceHistory`}>Delete Price History</Label>
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