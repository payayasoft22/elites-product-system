
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

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
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  // Query to fetch all registered users from Supabase Auth
  const { data: users, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      try {
        // Try to fetch all users using the admin API
        const { data, error } = await supabase.auth.admin.listUsers();
        
        if (error) {
          console.error("Error fetching users with admin API:", error);
          
          // Fallback: If admin API fails, at least get the current user
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            throw new Error("No active session");
          }
          
          // Create a users array starting with the current user
          const currentUserData: User = {
            id: session.user.id,
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || "You",
            email: session.user.email || "",
            role: session.user.user_metadata?.role || "User",
            status: "active",
            created_at: session.user.created_at,
            last_sign_in_at: session.user.last_sign_in_at
          };
          
          return [currentUserData];
        }
        
        // Map the users from the admin API to our User interface
        return data.users.map((user) => ({
          id: user.id,
          name: user.user_metadata?.full_name || user.user_metadata?.name || "N/A",
          email: user.email || "",
          role: user.user_metadata?.role || "User",
          status: user.last_sign_in_at ? "active" : "inactive" as "active" | "inactive",
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at
        }));
      } catch (error) {
        console.error("Error fetching users:", error);
        toast({
          title: "Error",
          description: "Failed to fetch users. Please try again later.",
          variant: "destructive",
        });
        throw new Error("Unable to fetch users");
      }
    }
  });

  // Set up realtime subscription for user presence
  useEffect(() => {
    // Initialize with current user as active
    if (users && users.length > 0 && currentUser) {
      const initialActiveUsers = users.filter(u => u.id === currentUser.id);
      setActiveUsers(initialActiveUsers);
    }
    
    const channel = supabase.channel('user_presence')
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        // Convert presence state to active users
        const currentActiveUserIds = Object.values(presenceState)
          .flat()
          .map((presence: any) => presence.user_id)
          .filter((id): id is string => Boolean(id));

        // Update active users based on presence
        if (users) {
          const updatedActiveUsers = users.filter(user => 
            currentActiveUserIds.includes(user.id)
          );
          
          // Ensure current user is included in active users
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
        if (status === 'SUBSCRIBED') {
          // Track current user's presence
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            await channel.track({
              user_id: session.user.id,
              online_at: new Date().toISOString(),
            });
          }
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

  return (
    <DashboardLayout>
      <Helmet>
        <title>Users | Price Paladin</title>
      </Helmet>
      
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Users</h1>
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
        
        <div className="grid gap-4 md:grid-cols-2">
          {/* All Users Card */}
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
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers?.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.name || "N/A"}
                          {currentUser && user.id === currentUser.id ? " (You)" : ""}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.role}</TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Active Users Card */}
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
                      <TableHead>Last Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.name || "N/A"}
                          {currentUser && user.id === currentUser.id ? " (You)" : ""}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>Now</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Users;
