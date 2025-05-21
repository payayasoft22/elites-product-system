import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface User {
  id: string;
  email: string;
  display_name?: string;
  role?: string;
  status: 'open' | 'closed';
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
        .select('id, email, display_name, role')
        .neq('role', 'admin') // Excluding admin role from this list
        .order('display_name', { ascending: true });

      if (error) throw error;

      console.log("Fetched users:", data);

      const usersWithStatus = (data || []).map(user => ({
        ...user,
        status: 'open' as const, // Default status
      }));

      setUsers(usersWithStatus);
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
          <p className="text-muted-foreground">Manage user access status and permissions</p>
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
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(user => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="hover:underline cursor-pointer">
                            {user.display_name || 'Unknown'}
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem className="flex items-center justify-between gap-4">
                              Add Product
                              <Switch />
                            </DropdownMenuItem>
                            <DropdownMenuItem className="flex items-center justify-between gap-4">
                              Edit
                              <Switch />
                            </DropdownMenuItem>
                            <DropdownMenuItem className="flex items-center justify-between gap-4">
                              Delete
                              <Switch />
                            </DropdownMenuItem>
                            <DropdownMenuItem className="flex items-center justify-between gap-4">
                              Price History
                              <Switch />
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
                        <div className="flex space-x-4">
                          <Button
                            variant="outline"
                            onClick={() => toast({ title: 'Edit', description: `Editing ${user.display_name}` })}
                            disabled={user.role === 'admin'}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => toast({ title: 'Delete', description: `Deleting ${user.display_name}` })}
                            disabled={user.role === 'admin'}
                          >
                            Delete
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
