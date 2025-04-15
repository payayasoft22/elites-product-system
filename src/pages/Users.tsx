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
        // Get the current session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("No active session");
        }

        // Get all users from the public.profiles table
        const { data: allUsers, error: usersError } = await supabase
          .from('profiles')
          .select('*');

        if (usersError) {
          throw usersError;
        }

        // Map the users to our User interface
        const mappedUsers: User[] = allUsers.map((user) => ({
          id: user.id,
          name: user.first_name || user.name || "N/A",
          email: user.email || "N/A",
          role: user.role || "User",
          status: user.last_sign_in_at ? "active" : "inactive" as "active" | "inactive",
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at
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

  // Set up realtime subscription for user presence
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
