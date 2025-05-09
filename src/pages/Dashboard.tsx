
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from "recharts";
import { ArrowUpRight, Package, Calendar, DollarSign, Clock } from "lucide-react";
import { format, subDays, parseISO } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Product } from "@/components/products/types";

// Mock data for the dashboard
const revenueData = Array.from({ length: 30 }, (_, i) => ({
  date: format(subDays(new Date(), 29 - i), "MMM dd"),
  value: Math.floor(Math.random() * 10000) + 5000,
}));

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [recentPriceUpdates, setRecentPriceUpdates] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch total products count
        const { count: productCount, error: productError } = await supabase
          .from('product')
          .select('*', { count: 'exact', head: true });
          
        if (productError) throw productError;
        
        // Fetch most recent products (top 5)
        const { data: recentProductsData, error: recentProductsError } = await supabase
          .from('product')
          .select('prodcode, description, unit')
          .order('prodcode', { ascending: false })
          .limit(5);
          
        if (recentProductsError) throw recentProductsError;
        
        // Fetch recent price updates
        const { data: priceUpdatesData, error: priceUpdatesError } = await supabase
          .from('pricehist')
          .select('prodcode, unitprice, effdate')
          .order('effdate', { ascending: false })
          .limit(5);
          
        if (priceUpdatesError) throw priceUpdatesError;
        
        // Enrich price updates with product descriptions
        const enrichedPriceUpdates = await Promise.all(
          (priceUpdatesData || []).map(async (update) => {
            const { data: productData } = await supabase
              .from('product')
              .select('description')
              .eq('prodcode', update.prodcode)
              .single();
              
            return {
              ...update,
              description: productData?.description || 'Unknown product'
            };
          })
        );
        
        // Create products with proper typing including currentPrice
        const typedProducts: Product[] = (recentProductsData || []).map(product => ({
          prodcode: product.prodcode,
          description: product.description,
          unit: product.unit,
          currentPrice: null // Adding the missing required property
        }));
        
        // Set the stats and data
        setRecentProducts(typedProducts);
        setRecentPriceUpdates(enrichedPriceUpdates || []);
        setStats({
          totalProducts: productCount || 0,
          totalRevenue: Math.floor(Math.random() * 100000) + 50000, // Mock data
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: "Error",
          description: "Failed to load dashboard data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [toast]);

  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-md shadow-md p-2 text-xs">
          <p className="font-medium">{label}</p>
          <p className="text-primary">
            ${payload[0].value?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
          </p>
        </div>
      );
    }
    return null;
  };

  const formatPrice = (price: number | null): string => {
    if (price === null) return "N/A";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatDate = (dateString: string): string => {
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch (e) {
      return dateString;
    }
  };

  return (
    <DashboardLayout>
      <Helmet>
        <title>Dashboard | Admin Panel</title>
      </Helmet>

      <div className="flex flex-col gap-5">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of your product inventory and system status.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{stats.totalProducts}</div>
              )}
              <p className="text-xs text-muted-foreground">
                Manage your product inventory
              </p>
            </CardContent>
            <CardFooter className="p-2">
              <Button variant="ghost" className="w-full text-xs" onClick={() => navigate('/products')}>
                View All Products
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Revenue (Simulated)
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">
                  ${stats.totalRevenue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                </div>
              )}
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <ArrowUpRight className="h-3 w-3" />
                +{Math.floor(Math.random() * 10) + 2}% since last month
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="mr-2 h-4 w-4" />
                Recent Products
              </CardTitle>
              <CardDescription>Latest products added to your inventory</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, idx) => (
                    <Skeleton key={idx} className="h-12 w-full" />
                  ))}
                </div>
              ) : recentProducts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Unit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentProducts.map((product) => (
                      <TableRow key={product.prodcode}>
                        <TableCell className="font-medium">{product.prodcode}</TableCell>
                        <TableCell>{product.description || "—"}</TableCell>
                        <TableCell>{product.unit || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No products found.
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => navigate('/products')}
              >
                View All Products
              </Button>
            </CardFooter>
          </Card>
          
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-4 w-4" />
                Recent Price Updates
              </CardTitle>
              <CardDescription>Latest price changes for products</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, idx) => (
                    <Skeleton key={idx} className="h-12 w-full" />
                  ))}
                </div>
              ) : recentPriceUpdates.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentPriceUpdates.map((update, idx) => (
                      <TableRow key={`${update.prodcode}-${update.effdate}-${idx}`}>
                        <TableCell className="font-medium">
                          <div>{update.prodcode}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {update.description}
                          </div>
                        </TableCell>
                        <TableCell>{formatPrice(update.unitprice)}</TableCell>
                        <TableCell>{formatDate(update.effdate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No price updates found.
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => navigate('/products')}
              >
                Manage Products
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-1">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Overview (Simulated Data)</CardTitle>
              <CardDescription>
                Revenue trend for the past 30 days
              </CardDescription>
            </CardHeader>
            <CardContent className="px-2">
              {loading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <Skeleton className="h-[250px] w-full" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={revenueData}
                    margin={{
                      top: 5,
                      right: 10,
                      left: 10,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getDate()}`;
                      }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) =>
                        `$${value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
                      }
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6, fill: "#8b5cf6" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
