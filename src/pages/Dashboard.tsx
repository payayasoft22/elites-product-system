
import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import DashboardLayout from "@/components/DashboardLayout";
import { usePermission } from "@/hooks/usePermission";
import AdminActionLog from "@/components/AdminActionLog";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Loader2, DollarSign, Package, Users } from "lucide-react";

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
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [recentPrices, setRecentPrices] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [totalUsers, setTotalUsers] = useState<number>(0);

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        // Fetch recent products
        const { data: products } = await supabase
          .from('product')
          .select('prodcode, description')
          .order('prodcode', { ascending: false })
          .limit(5);
          
        if (products) setRecentProducts(products);
        
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
          
        if (prices) setRecentPrices(prices);
        
        // Get total product count
        const { count: productCount } = await supabase
          .from('product')
          .select('*', { count: 'exact', head: true });
        
        if (productCount !== null) setTotalProducts(productCount);
        
        // Get total user count
        const { count: userCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        
        if (userCount !== null) setTotalUsers(userCount);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchDashboardData();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <DashboardLayout>
      <Helmet>
        <title>Dashboard | Elites Product Management</title>
      </Helmet>
      
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome to the Elites Product Management System
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">{totalProducts}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">{totalUsers}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Latest Updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">{recentPrices.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Price Updates</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentPrices.map((price, index) => (
                      <TableRow key={`${price.prodcode}-${index}`}>
                        <TableCell>
                          {price.product?.description || price.prodcode}
                        </TableCell>
                        <TableCell>${parseFloat(price.unitprice.toString()).toFixed(2)}</TableCell>
                        <TableCell>{formatDate(price.effdate)}</TableCell>
                      </TableRow>
                    ))}
                    {recentPrices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                          No recent price updates
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Recent Products</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentProducts.map((product) => (
                      <TableRow key={product.prodcode}>
                        <TableCell>{product.prodcode}</TableCell>
                        <TableCell>{product.description}</TableCell>
                      </TableRow>
                    ))}
                    {recentProducts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-4 text-muted-foreground">
                          No recent products
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Admin-only action log section */}
        {isAdmin && (
          <div className="mt-8">
            <AdminActionLog />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
