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
import { useAdminRequests } from "@/hooks/useAdminRequests";
import { 
  AlertCircle, 
  Check, 
  Shield, 
  User as UserIcon, 
  X, 
  RefreshCcw
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

const Users = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [selectedTab, setSelectedTab] = useState("all_users");
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const { isAdmin } = usePermission();
  const queryClient = useQueryClient();
  const { 
    allRequests, 
    requestAdminRole, 
    approveRequest, 
    rejectRequest,
    hasPendingRequest,
    requestsLoading: adminRequestsLoading,
    error: adminRequestsError
  } = useAdminRequests();

  const pendingRequests = allRequests?.filter(req => req.status === "pending") || [];

  const { data: users, isLoading, error, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      try {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*');

        if (profilesError) {
          throw profilesError;
        }

        const mappedUsers: User[] = profiles.map((profile: any) => ({
          id: profile.id,
          name: profile.first_name || profile.name || "N/A",
          email: profile.email || "N/A",
          role: profile.role || "user",
          status: profile.last_sign_in_at ? "active" : "inactive",
          created_at: profile.created_at,
          last_sign_in_at: profile.last_sign_in_at
        }));

        return mappedUsers;
      } catch (error) {
        console.error("Error fetching users:", error);
        toast({
          title: "Error",
          description: "Failed to fetch users. Please try again later.",
          variant: "destructive",
        });
        throw error;
      }
    }
  });

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
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update user role.",
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    const channel = supabase.channel('user_presence')
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const currentActiveUserIds = Object.values(presenceState)
          .flat()
          .map((presence: any) => presence.user_id)
          .filter((id): id is string => Boolean(id));

        if (users) {
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
        }
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

  const handleRequestAdminRole = async () => {
    try {
      await requestAdminRole.mutateAsync();
    } catch (error) {
      console.error("Admin request failed:", error);
    }
  };

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
              onClick={() => refetch()}
              title="Refresh user list"
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
              {!isAdmin && !hasPendingRequest && (
                <CardFooter className="flex justify-center pt-2 pb-4">
                  <Button
                    variant="outline"
                    onClick={handleRequestAdminRole}
                    disabled={requestAdminRole.isPending}
                  >
                    Request Admin Role
                    {requestAdminRole.isPending && (
