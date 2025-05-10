
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

// Define types for permissions data
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
  
  // Group permissions by role for easier display
  const permissionsByRole = permissionsData.reduce((acc, permission) => {
    if (!acc[permission.role]) {
      acc[permission.role] = [];
    }
    acc[permission.role].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  // Check if a request is pending for the current user
  const hasPendingRequest = (action: PermissionAction): boolean => {
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
      setPermissionsData(data);
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
      // Use admin_requests instead of permission_requests
      const { data, error } = await supabase
        .from('admin_requests')
        .select(`
          *,
          profiles:user_id(email, first_name, name)
        `)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      
      // Transform data to include user details
      const transformedData = (data || []).map((item: any) => {
        return {
          ...item,
          user_email: item.profiles?.email || 'Unknown',
          user_name: item.profiles?.first_name || item.profiles?.name || 'Unknown User',
          action: item.action as PermissionAction
        } as PermissionRequest;
      });
      
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
    try {
      // Make a type-safe update by explicitly defining the role type
      const roleValue: "user" | "admin" = permission.role as "user" | "admin";
      
      const { error } = await supabase
        .from('role_permissions')
        .update({ allowed })
        .eq('id', permission.id);

      if (error) throw error;

      // Update local state
      setPermissionsData(prevPermissions =>
        prevPermissions.map(p => (p.id === permission.id ? { ...p, allowed } : p))
      );

      // Create notification for all users about permission change
      const notifyAllUsers = async () => {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id');
        
        if (!profiles) return;
        
        const notifications = profiles.map(profile => ({
          type: 'permission_change',
          content: {
            action: permission.action,
            role: permission.role,
            allowed: allowed,
            changed_by: user?.email,
            changed_at: new Date().toISOString()
          },
          user_id: profile.id
        }));
        
        await supabase.from('notifications').insert(notifications);
      };
      
      // Notify users about the permission change
      await notifyAllUsers();

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
    if (!user) return;
    
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
      
      // Reload permission requests
      await fetchPermissionRequests();
      
      // Notify admins about the request
      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin');
        
      if (adminProfiles?.length) {
        const notifications = adminProfiles.map(admin => ({
          type: 'permission_request',
          content: {
            action: action,
            requested_by: user.email,
            requested_by_name: user.user_metadata?.full_name || 'A user',
            requested_at: new Date().toISOString()
          },
          user_id: admin.id
        }));
        
        await supabase.from('notifications').insert(notifications);
      }
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
      
      // Find the request to get the user_id and action
      const request = permissionRequests.find(r => r.id === requestId);
      if (!request) return;
      
      // Update the request status
      const { error: updateError } = await supabase
        .from('admin_requests')
        .update({
          status: status,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id
        })
        .eq('id', requestId);
        
      if (updateError) throw updateError;
      
      // If approved, create a notification for the user
      const notificationContent = {
        action: request.action,
        status: status,
        resolved_by: user.email,
        resolved_at: new Date().toISOString()
      };
      
      await supabase.from('notifications').insert({
        type: 'permission_request_resolved',
        content: notificationContent,
        user_id: request.user_id
      });
      
      // Reload the requests
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
    const userPermission = permissionsData.find(p => p.role === 'user' && p.action === action);
    return !!userPermission?.allowed;
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
                            <span className="font-medium">{getActionDisplayName(permission.action)}</span>
                            <Switch
                              checked={permission.allowed}
                              onCheckedChange={(checked) => updatePermission(permission, checked)}
                              disabled={role === 'user' && !user}
                            />
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            
            {!loading && user && (
              <Card>
                <CardHeader>
                  <CardTitle>Request Permissions</CardTitle>
                  <CardDescription>
                    Request access to perform specific actions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Alert variant="warning">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Limited Access</AlertTitle>
                      <AlertDescription>
                        Some actions are restricted and require admin approval. You can request access to these actions below.
                      </AlertDescription>
                    </Alert>
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Action</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Request Access</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {permissionsData
                          .filter(p => p.role === 'user' && !p.allowed)
                          .map((permission) => (
                            <TableRow key={permission.id}>
                              <TableCell>{getActionDisplayName(permission.action)}</TableCell>
                              <TableCell>
                                {hasPendingRequest(permission.action) ? (
                                  <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">
                                    Request Pending
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-red-50 text-red-800 border-red-300">
                                    No Access
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => requestPermission(permission.action)}
                                  disabled={hasPendingRequest(permission.action) || processingRequest === permission.action}
                                >
                                  {processingRequest === permission.action ? (
                                    <>
                                      <div className="mr-1 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                                      Processing...
                                    </>
                                  ) : hasPendingRequest(permission.action) ? (
                                    "Requested"
                                  ) : (
                                    "Request Access"
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
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
                      {permissionRequests.map((request) => {
                        const isPending = request.status === 'pending';
                        return (
                          <TableRow key={request.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{request.user_name}</div>
                                <div className="text-sm text-muted-foreground">{request.user_email}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {request.action ? getActionDisplayName(request.action) : 'Unknown action'}
                            </TableCell>
                            <TableCell>
                              {request.requested_at ? 
                                new Date(request.requested_at).toLocaleDateString() : 
                                new Date(request.created_at || '').toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {request.status === 'pending' && (
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">
                                  Pending
                                </Badge>
                              )}
                              {request.status === 'approved' && (
                                <Badge variant="outline" className="bg-green-50 text-green-800 border-green-300">
                                  Approved
                                </Badge>
                              )}
                              {request.status === 'rejected' && (
                                <Badge variant="outline" className="bg-red-50 text-red-800 border-red-300">
                                  Rejected
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {isPending ? (
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
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  {request.status === 'approved' ? 'Approved' : 'Rejected'} on{' '}
                                  {request.resolved_at ? new Date(request.resolved_at).toLocaleDateString() : 'unknown date'}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
