import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { PermissionAction } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Permission {
  id: string;
  role: "user" | "admin";
  action: PermissionAction;
  allowed: boolean;
  created_at?: string;
}

interface PermissionRequest {
  id: string;
  user_id: string;
  action: PermissionAction;
  status: "pending" | "approved" | "rejected";
  created_at?: string;
  requested_at?: string;
  resolved_at?: string;
  resolved_by?: string;
  user_email?: string;
  user_name?: string;
}

const UserPermissions = () => {
  const [permissionsData, setPermissionsData] = useState<Permission[]>([]);
  const [permissionRequests, setPermissionRequests] = useState<PermissionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const ALWAYS_ALLOWED_ACTIONS: PermissionAction[] = [
    'open_product',
    'close_product'
  ];

  const permissionsByRole = permissionsData.reduce((acc, permission) => {
    if (!acc[permission.role]) {
      acc[permission.role] = [];
    }
    acc[permission.role].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const hasPendingRequest = (action: PermissionAction): boolean => {
    if (ALWAYS_ALLOWED_ACTIONS.includes(action)) return false;
    return permissionRequests.some(
      request => request.user_id === user?.id && request.action === action && request.status === 'pending'
    );
  };

  useEffect(() => {
    fetchPermissions();
    fetchPermissionRequests();
  }, []);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .order('role', { ascending: true })
        .order('action', { ascending: true });

      if (error) throw error;
      
      // Force set allowed=true for our always-allowed actions
      const modifiedData = data.map(permission => ({
        ...permission,
        allowed: ALWAYS_ALLOWED_ACTIONS.includes(permission.action) ? true : permission.allowed
      }));
      
      setPermissionsData(modifiedData);
    } catch (error: any) {
      console.error('Error fetching permissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load permission settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissionRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_requests')
        .select(`
          *,
          profiles:user_id(email, first_name, name)
        `)
        .order('requested_at', { ascending: false });

      if (error) throw error;

      const transformedData = (data || []).map((item: any) => ({
        ...item,
        user_email: item.profiles?.email || 'Unknown',
        user_name: item.profiles?.first_name || item.profiles?.name || 'Unknown User',
        action: item.action as PermissionAction
      } as PermissionRequest));

      setPermissionRequests(transformedData);
    } catch (error: any) {
      console.error('Error fetching permission requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load permission requests',
        variant: 'destructive',
      });
    }
  };

  const updatePermission = async (permission: Permission, allowed: boolean) => {
    // Skip update for always-allowed actions
    if (ALWAYS_ALLOWED_ACTIONS.includes(permission.action)) {
      toast({
        title: 'Notice',
        description: 'This permission cannot be modified',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('role_permissions')
        .update({ allowed })
        .eq('id', permission.id);

      if (error) throw error;

      setPermissionsData(prevPermissions =>
        prevPermissions.map(p => (p.id === permission.id ? { ...p, allowed } : p))
      );

      toast({
        title: 'Permission Updated',
        description: `${permission.action} permission has been ${allowed ? 'enabled' : 'disabled'} for ${permission.role} role.`,
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

  const requestPermission = async (action: PermissionAction) => {
    if (!user || ALWAYS_ALLOWED_ACTIONS.includes(action)) return;

    try {
      setProcessingRequest(action);
      const { error } = await supabase
        .from('admin_requests')
        .insert({
          user_id: user.id,
          action: action,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: 'Request Submitted',
        description: `Your request for "${getActionDisplayName(action)}" permission has been submitted.`,
      });
      await fetchPermissionRequests();
    } catch (error: any) {
      console.error('Error requesting permission:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit permission request',
        variant: 'destructive',
      });
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRequestAction = async (requestId: string, status: 'approved' | 'rejected') => {
    if (!user) return;

    try {
      setProcessingRequest(requestId);
      const request = permissionRequests.find(r => r.id === requestId);
      if (!request) return;

      const { error: updateError } = await supabase
        .from('admin_requests')
        .update({
          status: status,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      await fetchPermissionRequests();
      toast({
        title: 'Request Processed',
        description: `Permission request has been ${status}.`,
      });
    } catch (error: any) {
      console.error('Error processing permission request:', error);
      toast({
        title: 'Error',
        description: 'Failed to process permission request',
        variant: 'destructive',
      });
    } finally {
      setProcessingRequest(null);
    }
  };

  const getActionDisplayName = (action: string): string => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const userCanPerformAction = (action: PermissionAction): boolean => {
    return ALWAYS_ALLOWED_ACTIONS.includes(action) || 
      !!permissionsData.find(p => p.role === 'user' && p.action === action)?.allowed;
  };

  if (!user) {
    return <div>Loading user information...</div>;
  }

  return (
    <DashboardLayout>
      <Helmet>
        <title>User Permissions | Elites Product Management</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">User Permissions</h2>
          <p className="text-muted-foreground">
            Configure what actions different user roles can perform.
          </p>
        </div>

        <Tabs defaultValue="permissions">
          <TabsList className="mb-4">
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="requests">
              Permission Requests
              {permissionRequests.filter(req => req.status === 'pending').length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {permissionRequests.filter(req => req.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="permissions" className="space-y-4">
            {loading ? (
              <div className="flex justify-center p-6">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {Object.entries(permissionsByRole).map(([role, permissions]) => (
                  <Card key={role} className="overflow-hidden">
                    <CardHeader className={role === 'admin' ? 'bg-primary/10' : 'bg-muted/50'}>
                      <CardTitle className="capitalize">{role} Permissions</CardTitle>
                      <CardDescription>
                        {role === 'admin' ? 
                          'Administrator privileges and capabilities' : 
                          'Default permissions for regular users'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ul className="divide-y">
                        {permissions.map((permission) => (
                          <li key={permission.id} className="flex items-center justify-between p-4">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{getActionDisplayName(permission.action)}</span>
                              {ALWAYS_ALLOWED_ACTIONS.includes(permission.action) && (
                                <Badge variant="secondary">Always Allowed</Badge>
                              )}
                            </div>
                            <Switch
                              checked={permission.allowed}
                              onCheckedChange={(checked) => updatePermission(permission, checked)}
                              disabled={ALWAYS_ALLOWED_ACTIONS.includes(permission.action)}
                            />
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle>Permission Requests</CardTitle>
                <CardDescription>
                  Review and manage user requests for additional permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {permissionRequests.length === 0 ? (
                  <div className="text-center p-6 text-muted-foreground">
                    No permission requests found
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Permission</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {permissionRequests
                        .filter(request => !ALWAYS_ALLOWED_ACTIONS.includes(request.action))
                        .map((request) => (
                          <TableRow key={request.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{request.user_name}</div>
                                <div className="text-sm text-muted-foreground">{request.user_email}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getActionDisplayName(request.action)}
                            </TableCell>
                            <TableCell>
                              {new Date(request.requested_at || request.created_at || '').toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {request.status === 'pending' ? (
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">
                                  Pending
                                </Badge>
                              ) : request.status === 'approved' ? (
                                <Badge variant="outline" className="bg-green-50 text-green-800 border-green-300">
                                  Approved
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-50 text-red-800 border-red-300">
                                  Rejected
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {request.status === 'pending' && (
                                <div className="flex space-x-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="border-green-500 text-green-700 hover:bg-green-50"
                                    onClick={() => handleRequestAction(request.id, 'approved')}
                                    disabled={processingRequest === request.id}
                                  >
                                    <Check className="mr-1 h-4 w-4" />
                                    Approve
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="border-red-500 text-red-700 hover:bg-red-50"
                                    onClick={() => handleRequestAction(request.id, 'rejected')}
                                    disabled={processingRequest === request.id}
                                  >
                                    <X className="mr-1 h-4 w-4" />
                                    Reject
                                  </Button>
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
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default UserPermissions;