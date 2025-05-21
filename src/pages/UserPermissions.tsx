import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface User {
  id: string;
  email: string;
  display_name?: string;
  role?: string;
  status: 'open' | 'closed';
  permissions?: {
    addProduct?: {
      edit: boolean;
      delete: boolean;
    };
    priceHistory?: {
      edit: boolean;
      delete: boolean;
    };
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
        .neq('role', 'admin')
        .order('display_name', { ascending: true });

      if (error) throw error;

      const usersWithDefaults = (data || []).map(user => ({
        ...user,
        status: 'open' as const,
        permissions: user.permissions || {
          addProduct: { edit: false, delete: false },
          priceHistory: { edit: false, delete: false }
        }
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

  const updateUserStatus = async (userId: string, status: 'open' | 'closed') => {
    try {
      setUsers(prevUsers =>
        prevUsers.map(u => (u.id === userId ? { ...u, status } : u))
      );

      toast({
        title: 'Status Updated',
        description: `User status set to ${status}`,
      });
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const updatePermission = async (userId: string, permissionType: 'addProduct' | 'priceHistory', action: 'edit' | 'delete', value: boolean) => {
    try {
      setUsers(prevUsers =>
        prevUsers.map(u => {
          if (u.id === userId) {
            return {
              ...u,
              permissions: {
                ...u.permissions,
                [permissionType]: {
                  ...u.permissions?.[permissionType],
                  [action]: value
                }
              }
            };
          }
          return u;
        })
      );

      // Update in database
      const userToUpdate = users.find(u => u.id === userId);
      if (userToUpdate) {
        const { error } = await supabase
          .from('profiles')
          .update({ permissions: userToUpdate.permissions })
          .eq('id', userId);

        if (error) throw error;
      }

      toast({
        title: 'Permission Updated',
        description: `Updated ${permissionType} ${action} permission`,
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
          <p className="text-muted-foreground">Manage user access status</p>
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
                    <TableHead>Status</TableHead>
                    <TableHead>Permissions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(user => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="hover:underline">
                              {user.display_name || 'Unknown'}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-56">
                            <DropdownMenuItem className="flex flex-col items-start gap-2 p-3">
                              <div className="flex items-center justify-between w-full">
                                <span>Add Product</span>
                              </div>
                              <div className="flex items-center justify-between w-full pl-4">
                                <span>Edit</span>
                                <Switch
                                  checked={user.permissions?.addProduct?.edit || false}
                                  onCheckedChange={(checked) => updatePermission(user.id, 'addProduct', 'edit', checked)}
                                />
                              </div>
                              <div className="flex items-center justify-between w-full pl-4">
                                <span>Delete</span>
                                <Switch
                                  checked={user.permissions?.addProduct?.delete || false}
                                  onCheckedChange={(checked) => updatePermission(user.id, 'addProduct', 'delete', checked)}
                                />
                              </div>
                            </DropdownMenuItem>

                            <DropdownMenuItem className="flex flex-col items-start gap-2 p-3">
                              <div className="flex items-center justify-between w-full">
                                <span>Price History</span>
                              </div>
                              <div className="flex items-center justify-between w-full pl-4">
                                <span>Edit</span>
                                <Switch
                                  checked={user.permissions?.priceHistory?.edit || false}
                                  onCheckedChange={(checked) => updatePermission(user.id, 'priceHistory', 'edit', checked)}
                                />
                              </div>
                              <div className="flex items-center justify-between w-full pl-4">
                                <span>Delete</span>
                                <Switch
                                  checked={user.permissions?.priceHistory?.delete || false}
                                  onCheckedChange={(checked) => updatePermission(user.id, 'priceHistory', 'delete', checked)}
                                />
                              </div>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Select
                          value={user.status}
                          onValueChange={(value: 'open' | 'closed') => updateUserStatus(user.id, value)}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            Add Product: {user.permissions?.addProduct?.edit ? 'Edit✅' : 'Edit❌'} {user.permissions?.addProduct?.delete ? 'Delete✅' : 'Delete❌'}
                          </Button>
                          <Button variant="outline" size="sm">
                            Price History: {user.permissions?.priceHistory?.edit ? 'Edit✅' : 'Edit❌'} {user.permissions?.priceHistory?.delete ? 'Delete✅' : 'Delete❌'}
                          </Button>
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
