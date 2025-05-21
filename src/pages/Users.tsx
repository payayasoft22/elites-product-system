import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { usePermission } from "@/hooks/usePermission";
import { 
  AlertCircle, 
  Check, 
  Shield, 
  User as UserIcon, 
  X, 
  RefreshCcw,
  Clock,
  UserCheck,
  UserX
} from "lucide-react";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  status: "active" | "inactive";
  created_at: string;
  last_sign_in_at?: string | null;
}

interface AdminRequest {
  id: string;
  user_id: string;
  name: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  processed_at?: string | null;
  processed_by?: string | null;
}

const Users = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [selectedTab, setSelectedTab] = useState("all_users");
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const { isAdmin } = usePermission();
  const queryClient = useQueryClient();

  // Fetch all users
  const { data: users, isLoading, error, refetch: refetchUsers } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      return profiles.map((profile: any) => ({
        id: profile.id,
        name: profile.first_name || profile.name || "N/A",
        email: profile.email || "N/A",
        role: profile.role || "user",
        status: profile.last_sign_in_at ? "active" : "inactive",
        created_at: profile.created_at,
        last_sign_in_at: profile.last_sign_in_at
      })) as User[];
    }
  });

  // Fetch all admin requests
  const { data: adminRequests = [], refetch: refetchRequests } = useQuery({
    queryKey: ["adminRequests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_requests")
        .select("*")
        .order("requested_at", { ascending: false });

      if (error) throw error;
      return data as AdminRequest[];
    }
  });

  // Check if current user has a pending or rejected request
  const { data: userRequestStatus } = useQuery({
    queryKey: ["userRequestStatus", currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return null;
      
      const { data, error } = await supabase
        .from("admin_requests")
        .select("status")
        .eq("user_id", currentUser.id)
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data?.status || null;
    },
    enabled: !!currentUser?.id
  });

  // Mutation to request admin role
  const requestAdminRole = useMutation({
    mutationFn: async () => {
      if (!currentUser) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from("admin_requests")
        .insert([{
          user_id: currentUser.id,
          name: currentUser.user_metadata?.name || currentUser.email,
          email: currentUser.email,
          status: "pending"
        }])
        .select();

      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      toast({
        title: "Request submitted",
        description: "Your admin request has been submitted for review.",
      });
      queryClient.invalidateQueries(["userRequestStatus"]);
      refetchRequests();
    },
    onError: (error) => {
      toast({
        title: "Request failed",
        description: error.message || "Failed to submit admin request.",
        variant: "destructive",
      });
    }
  });

  // Mutation to approve admin request
  const approveRequest = useMutation({
    mutationFn: async ({ requestId, userId }: { requestId: string; userId: string }) => {
      if (!currentUser?.id) throw new Error("Not authenticated");
      
      // Update user role in profiles table
      const { error: roleError } = await supabase
        .from("profiles")
        .update({ role: "admin" })
        .eq("id", userId);

      if (roleError) throw roleError;

      // Update request status
      const { error: requestError } = await supabase
        .from("admin_requests")
        .update({ 
          status: "approved",
          processed_at: new Date().toISOString(),
          processed_by: currentUser.id
        })
        .eq("id", requestId);

      if (requestError) throw requestError;
    },
    onSuccess: () => {
      toast({
        title: "Request approved",
        description: "User has been granted admin privileges.",
      });
      queryClient.invalidateQueries(["users"]);
      queryClient.invalidateQueries(["adminRequests"]);
    },
    onError: (error) => {
      toast({
        title: "Approval failed",
        description: error.message || "Failed to approve request.",
        variant: "destructive",
      });
    }
  });

  // Mutation to reject admin request
  const rejectRequest = useMutation({
    mutationFn: async (requestId: string) => {
      if (!currentUser?.id) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("admin_requests")
        .update({ 
          status: "rejected",
          processed_at: new Date().toISOString(),
          processed_by: currentUser.id
        })
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Request rejected",
        description: "Admin request has been rejected.",
      });
      queryClient.invalidateQueries(["adminRequests"]);
      queryClient.invalidateQueries(["userRequestStatus"]);
    },
    onError: (error) => {
      toast({
        title: "Rejection failed",
        description: error.message || "Failed to reject request.",
        variant: "destructive",
      });
    }
  });

  // Mutation to update user role
  const updateUserRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      return { userId, newRole };
    },
    onSuccess: () => {
      toast({
        title: "Role updated",
        description: "User role has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update user role.",
        variant: "destructive",
      });
    }
  });

  // Set up realtime subscription for user presence
  useEffect(() => {
    if (!users) return;

    const channel = supabase.channel('user_presence')
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const currentActiveUserIds = Object.values(presenceState)
          .flat()
          .map((presence: any) => presence.user_id)
          .filter((id): id is string => Boolean(id));

        const updatedActiveUsers = users.filter(user => 
          currentActiveUserIds.includes(user.id)
        );
        
        if (currentUser && !updatedActiveUsers.some(u => u.id === currentUser.id)) {
          const currentUserData = users.find(u => u.id === currentUser.id);
          if (currentUserData) {
            updatedActiveUsers.push(currentUserData);
          }
        }
        
        setActiveUsers(updatedActiveUsers);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && currentUser) {
          await channel.track({
            user_id: currentUser.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [users, currentUser]);

  const filteredUsers = users?.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      return "Invalid date";
    }
  };

  const getUserInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return "bg-purple-100 text-purple-800 border-purple-300";
      default:
        return "bg-blue-100 text-blue-800 border-blue-300";
    }
  };

  const getRequestStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><UserCheck className="h-3 w-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><UserX className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const pendingRequests = adminRequests.filter(req => req.status === "pending");
  const approvedRequests = adminRequests.filter(req => req.status === "approved");
  const rejectedRequests = adminRequests.filter(req => req.status === "rejected");

  return (
    <DashboardLayout>
      <Helmet>
        <title>Users | Price Paladin</title>
      </Helmet>
      
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Users</h1>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => {
                refetchUsers();
                refetchRequests();
              }}
              title="Refresh data"
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>
            <div className="relative">
              <input
                type="text"
                placeholder="Search users..."
                className="px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all_users">All Users</TabsTrigger>
            <TabsTrigger value="active_users">Active Users</TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="admin_requests" className="relative">
                Admin Requests
                {pendingRequests.length > 0 && (
                  <Badge variant="destructive" className="ml-2 px-1.5 h-5 min-w-5 flex items-center justify-center rounded-full">
                    {pendingRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="all_users" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>
                  Total registered users: {filteredUsers?.length || 0}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex gap-4 items-center">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[250px]" />
                          <Skeleton className="h-4 w-[200px]" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : error ? (
                  <div className="text-center py-4 text-red-500">
                    Error loading users: {(error as Error).message}
                  </div>
                ) : filteredUsers?.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No users found matching your search.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined Date</TableHead>
                        {isAdmin && <TableHead>Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers?.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback className="bg-primary text-primary-foreground">
                                  {getUserInitials(user.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium flex items-center gap-2">
                                  {user.name || "N/A"}
                                  {currentUser && user.id === currentUser.id && (
                                    <Badge variant="outline" className="ml-1">You</Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getRoleBadgeColor(user.role)} font-medium px-2 py-1 rounded-md`}>
                              {user.role === 'admin' ? (
                                <div className="flex items-center gap-1">
                                  <Shield className="h-3 w-3" />
                                  <span>Admin</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <UserIcon className="h-3 w-3" />
                                  <span>User</span>
                                </div>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(user.created_at)}</TableCell>
                          {isAdmin && (
                            <TableCell>
                              {currentUser && user.id !== currentUser.id && (
                                <Select
                                  defaultValue={user.role}
                                  onValueChange={(value) => {
                                    updateUserRole.mutate({ userId: user.id, newRole: value });
                                  }}
                                >
                                  <SelectTrigger className="w-[120px]">
                                    <SelectValue placeholder="Select role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
              {!isAdmin && (
                <CardFooter className="flex justify-center pt-2 pb-4">
                  {!userRequestStatus && (
                    <Button
                      variant="outline"
                      onClick={() => requestAdminRole.mutate()}
                      disabled={requestAdminRole.isPending}
                    >
                      Request Admin Role
                      {requestAdminRole.isPending && (
                        <div className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      )}
                    </Button>
                  )}
                  {userRequestStatus === "pending" && (
                    <Badge variant="outline" className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-500" />
                        Admin request pending approval
                      </div>
                    </Badge>
                  )}
                  {userRequestStatus === "approved" && (
                    <Badge className="bg-green-100 text-green-800 py-2 px-3">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4" />
                        Admin access granted
                      </div>
                    </Badge>
                  )}
                  {userRequestStatus === "rejected" && (
                    <div className="flex flex-col items-center gap-2">
                      <Badge variant="destructive" className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <UserX className="h-4 w-4" />
                          Admin request rejected
                        </div>
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => requestAdminRole.mutate()}
                        disabled={requestAdminRole.isPending}
                      >
                        Request Again
                      </Button>
                    </div>
                  )}
                </CardFooter>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="active_users" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Active Users</CardTitle>
                <CardDescription>
                  Currently active users: {activeUsers.length}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activeUsers.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No users currently active.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Last Active</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback className="bg-green-100 text-green-800">
                                  {getUserInitials(user.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="font-medium">
                                {user.name || "N/A"}
                                {currentUser && user.id === currentUser.id && " (You)"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge className={`${getRoleBadgeColor(user.role)} font-medium px-2 py-1 rounded-md`}>
                              {user.role || "User"}
                            </Badge>
                          </TableCell>
                          <TableCell>Now</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="admin_requests" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Admin Role Requests</CardTitle>
                  <CardDescription>
                    Review and manage requests for admin privileges
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="pending" className="mb-4">
                    <TabsList>
                      <TabsTrigger value="pending">
                        Pending
                        {pendingRequests.length > 0 && (
                          <Badge variant="destructive" className="ml-2 px-1.5 h-5 min-w-5 flex items-center justify-center rounded-full">
                            {pendingRequests.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="approved">Approved</TabsTrigger>
                      <TabsTrigger value="rejected">Rejected</TabsTrigger>
                    </TabsList>
                    <TabsContent value="pending">
                      {pendingRequests.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">
                          <div className="w-full flex justify-center mb-4">
                            <div className="rounded-full bg-gray-100 p-4">
                              <Shield className="h-10 w-10 text-gray-400" />
                            </div>
                          </div>
                          <p>No pending admin requests</p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>User</TableHead>
                              <TableHead>Requested</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pendingRequests.map((request) => (
                              <TableRow key={request.id}>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar>
                                      <AvatarFallback className="bg-yellow-100 text-yellow-800">
                                        {getUserInitials(request.name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="font-medium">{request.name}</div>
                                      <div className="text-sm text-muted-foreground">{request.email}</div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>{formatDate(request.requested_at)}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      className="border-green-500 hover:bg-green-50 text-green-700"
                                      onClick={() => approveRequest.mutate({ 
                                        requestId: request.id, 
                                        userId: request.user_id 
                                      })}
                                      disabled={approveRequest.isPending}
                                    >
                                      <Check className="h-4 w-4 mr-1" />
                                      Approve
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      className="border-red-500 hover:bg-red-50 text-red-700"
                                      onClick={() => rejectRequest.mutate(request.id)}
                                      disabled={rejectRequest.isPending}
                                    >
                                      <X className="h-4 w-4 mr-1" />
                                      Reject
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </TabsContent>
                    <TabsContent value="approved">
                      {approvedRequests.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">
                          <div className="w-full flex justify-center mb-4">
                            <div className="rounded-full bg-green-100 p-4">
                              <UserCheck className="h-10 w-10 text-green-400" />
                            </div>
                          </div>
                          <p>No approved admin requests</p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>User</TableHead>
                              <TableHead>Requested</TableHead>
                              <TableHead>Approved</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {approvedRequests.map((request) => (
                              <TableRow key={request.id}>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar>
                                      <AvatarFallback className="bg-green-100 text-green-800">
                                        {getUserInitials(request.name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="font-medium">{request.name}</div>
                                      <div className="text-sm text-muted-foreground">{request.email}</div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>{formatDate(request.requested_at)}</TableCell>
                                <TableCell>{formatDate(request.processed_at)}</TableCell>
                                <TableCell>
                                  {getRequestStatusBadge(request.status)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </TabsContent>
                    <TabsContent value="rejected">
                      {rejectedRequests.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">
                          <div className="w-full flex justify-center mb-4">
                            <div className="rounded-full bg-red-100 p-4">
                              <UserX className="h-10 w-10 text-red-400" />
                            </div>
                          </div>
                          <p>No rejected admin requests</p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>User</TableHead>
                              <TableHead>Requested</TableHead>
                              <TableHead>Rejected</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rejectedRequests.map((request) => (
                              <TableRow key={request.id}>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar>
                                      <AvatarFallback className="bg-red-100 text-red-800">
                                        {getUserInitials(request.name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="font-medium">{request.name}</div>
                                      <div className="text-sm text-muted-foreground">{request.email}</div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>{formatDate(request.requested_at)}</TableCell>
                                <TableCell>{formatDate(request.processed_at)}</TableCell>
                                <TableCell>
                                  {getRequestStatusBadge(request.status)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Users;
