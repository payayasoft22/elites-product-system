
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  // Fetch users from Supabase authentication
  const { data: users, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      try {
        // Get current auth user first
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (!currentUser) {
          throw new Error("Unable to fetch current user");
        }
        
        // Fetch all users from the Auth API
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
        
        if (authError) {
          console.error("Error fetching users:", authError);
          
          // If we can't get all users, at least return the current user
          toast({
            title: "User Information Notice",
            description: "Could only retrieve current user information. Admin access is required to view all users.",
            variant: "default"
          });
          
          return [{
            id: currentUser.id,
            name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || "Current User",
            email: currentUser.email || "",
            role: currentUser.user_metadata?.role || "User",
            status: "active",
            created_at: currentUser.created_at,
            last_sign_in_at: currentUser.last_sign_in_at
          }];
        }
        
        if (authData?.users && authData.users.length > 0) {
          return authData.users.map(user => ({
            id: user.id,
            name: user.user_metadata?.full_name || user.user_metadata?.name || "N/A",
            email: user.email || "",
            role: user.user_metadata?.role || "User",
            status: user.banned ? "inactive" : "active",
            created_at: user.created_at,
            last_sign_in_at: user.last_sign_in_at
          }));
        }
        
        // Fallback to empty array
        return [];
      } catch (error) {
        console.error("Error:", error);
        throw new Error("Unable to fetch users");
      }
    }
  });

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
        
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              View and manage system users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
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
                No registered users found. When users register on your system, they will appear here.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined Date</TableHead>
                    <TableHead>Last Sign In</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name || "N/A"}</TableCell>
                      <TableCell>{user.email || "N/A"}</TableCell>
                      <TableCell>{user.role || "User"}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.status === "inactive" ? "bg-gray-100 text-gray-800" : "bg-green-100 text-green-800"
                        }`}>
                          {user.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell>
                        {formatDate(user.last_sign_in_at)}
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

export default Users;
