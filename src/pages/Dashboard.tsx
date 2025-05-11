
import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import DashboardLayout from "@/components/DashboardLayout";
import { usePermission } from "@/hooks/usePermission";
import AdminActionLog from "@/components/AdminActionLog";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2, BarChart, ShoppingBag, Users, TrendingUp, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

interface Product {
  prodcode: string;
  description: string;
}

interface PriceHistory {
  prodcode: string;
  unitprice: number;
  effdate: string;
  product: {
    description: string;
  }
}

const Dashboard = () => {
  const { isAdmin } = usePermission();
  const [loading, setLoading] = useState(true);

  // Use React Query for data fetching
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["dashboardData"],
    queryFn: async () => {
      try {
        // Fetch recent products
        const { data: products } = await supabase
          .from('product')
          .select('prodcode, description')
          .order('prodcode', { ascending: false })
          .limit(5);
          
        // Fetch recent price updates with product descriptions
        const { data: prices } = await supabase
          .from('pricehist')
          .select(`
            prodcode, 
            unitprice, 
            effdate,
            product:prodcode(description)
          `)
          .order('effdate', { ascending: false })
          .limit(5);
          
        // Get total product count
        const { count: productCount } = await supabase
          .from('product')
          .select('*', { count: 'exact', head: true });
        
        // Get total user count
        const { count: userCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        
        // Get price change count for the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { count: recentPriceChanges } = await supabase
          .from('pricehist')
          .select('*', { count: 'exact', head: true })
          .gte('effdate', thirtyDaysAgo.toISOString());
        
        return {
          products: products || [],
          prices: prices || [],
          totalProducts: productCount || 0,
          totalUsers: userCount || 0,
          recentPriceChanges: recentPriceChanges || 0
        };
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        throw error;
      }
    }
  });

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      return "Invalid date";
    }
  };

  return (
    <DashboardLayout>
      <Helmet>
        <title>Dashboard | Elites Product Management</title>
      </Helmet>
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground mt-1">
              Welcome to the Elites Product Management System
            </p>
          </div>
          
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(), 'PPP')}</span>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-6 w-16 bg-muted animate-pulse rounded"></div>
              ) : (
                <div className="text-2xl font-bold">{dashboardData?.totalProducts}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Products in the catalog
              </p>
            </CardContent>
          </Card>
          
          <Card className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-6 w-16 bg-muted animate-pulse rounded"></div>
              ) : (
                <div className="text-2xl font-bold">{dashboardData?.totalUsers}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Active system users
              </p>
            </CardContent>
          </Card>
          
          <Card className="transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Recent Updates</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-6 w-16 bg-muted animate-pulse rounded"></div>
              ) : (
                <div className="text-2xl font-bold">{dashboardData?.recentPriceChanges}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Price updates in last 30 days
              </p>
            </CardContent>
          </Card>
          
          <Card className="transition-all hover:shadow-md bg-gradient-to-br from-blue-50 to-slate-50 dark:from-blue-950/20 dark:to-slate-950/40 border-blue-100 dark:border-blue-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Performance</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Optimal</div>
              <p className="text-xs text-muted-foreground mt-1">
                System running smoothly
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Data Tables */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="transition-all hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Recent Price Updates</CardTitle>
              <CardDescription>Latest price changes in the system</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboardData?.prices.map((price: any, index: number) => (
                        <TableRow key={`${price.prodcode}-${index}`} className="hover:bg-muted/50">
                          <TableCell className="font-medium">
                            {price.product?.description || price.prodcode}
                          </TableCell>
                          <TableCell>${parseFloat(price.unitprice.toString()).toFixed(2)}</TableCell>
                          <TableCell>{formatDate(price.effdate)}</TableCell>
                        </TableRow>
                      ))}
                      {(dashboardData?.prices.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                            No recent price updates
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="transition-all hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Recent Products</CardTitle>
              <CardDescription>Latest products added to the catalog</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboardData?.products.map((product: any) => (
                        <TableRow key={product.prodcode} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{product.prodcode}</TableCell>
                          <TableCell>{product.description}</TableCell>
                        </TableRow>
                      ))}
                      {(dashboardData?.products.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center py-4 text-muted-foreground">
                            No recent products
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Admin-only action log section */}
        {isAdmin && (
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Admin Action Log</CardTitle>
                <CardDescription>Recent administrative actions in the system</CardDescription>
              </CardHeader>
              <CardContent>
                <AdminActionLog />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
