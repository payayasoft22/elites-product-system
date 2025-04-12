
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, DollarSign, TrendingUp, Users, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface PriceChange {
  prodcode: string;
  description: string | null;
  unitprice: number | null;
  effdate: string;
}

interface RecentProduct {
  prodcode: string;
  description: string | null;
  unit: string | null;
  created_at: string;
  unitprice: number | null;
}

const StatCard = ({ title, value, icon, description }: { 
  title: string;
  value: string;
  icon: React.ReactNode;
  description: string;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
        {icon}
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const [products, setProducts] = useState<number>(0);
  const [avgPrice, setAvgPrice] = useState<number | null>(null);
  const [priceUpdates, setPriceUpdates] = useState<number>(0);
  const [recentPriceChanges, setRecentPriceChanges] = useState<PriceChange[]>([]);
  const [recentProducts, setRecentProducts] = useState<RecentProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const formatPrice = (price: number | null): string => {
    if (price === null) return "N/A";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      return dateString;
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch product count
        const { count: productCount, error: productError } = await supabase
          .from('product')
          .select('*', { count: 'exact', head: true });
        
        if (productError) throw productError;
        setProducts(productCount || 0);
        
        // Fetch recent price changes
        const { data: priceHistData, error: priceHistError } = await supabase
          .from('pricehist')
          .select(`
            prodcode,
            unitprice,
            effdate,
            product (
              description
            )
          `)
          .order('effdate', { ascending: false })
          .limit(5);
          
        if (priceHistError) throw priceHistError;
        
        const formattedPriceChanges = priceHistData.map(item => ({
          prodcode: item.prodcode,
          description: item.product?.description,
          unitprice: item.unitprice,
          effdate: item.effdate
        }));
        
        setRecentPriceChanges(formattedPriceChanges);
        setPriceUpdates(priceHistData.length);
        
        // Calculate average price
        if (priceHistData.length > 0) {
          const prices = priceHistData
            .filter(item => item.unitprice !== null)
            .map(item => item.unitprice as number);
            
          if (prices.length > 0) {
            const total = prices.reduce((sum, price) => sum + price, 0);
            setAvgPrice(total / prices.length);
          }
        }
        
        // Fetch recent products with their latest prices
        const { data: recentProductsData, error: recentProductsError } = await supabase
          .from('product')
          .select('*')
          .order('prodcode', { ascending: false })
          .limit(5);
          
        if (recentProductsError) throw recentProductsError;
        
        if (recentProductsData) {
          const productsWithPrices = await Promise.all(
            recentProductsData.map(async (product) => {
              const { data: priceData, error: priceError } = await supabase
                .from('pricehist')
                .select('unitprice, effdate')
                .eq('prodcode', product.prodcode)
                .order('effdate', { ascending: false })
                .limit(1);
                
              if (priceError) {
                console.error(`Error fetching price for ${product.prodcode}:`, priceError);
                return {
                  ...product,
                  unitprice: null,
                  created_at: new Date().toISOString()
                };
              }
              
              return {
                ...product,
                unitprice: priceData && priceData.length > 0 ? priceData[0].unitprice : null,
                created_at: priceData && priceData.length > 0 ? priceData[0].effdate : new Date().toISOString()
              };
            })
          );
          
          setRecentProducts(productsWithPrices);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Overview of your product management system.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Products"
            value={String(products)}
            icon={<Package className="h-4 w-4" />}
            description="Product catalog overview"
          />
          <StatCard
            title="Average Price"
            value={avgPrice ? formatPrice(avgPrice) : "N/A"}
            icon={<DollarSign className="h-4 w-4" />}
            description="Based on recent updates"
          />
          <StatCard
            title="Price Updates"
            value={String(priceUpdates)}
            icon={<TrendingUp className="h-4 w-4" />}
            description="Total price change records"
          />
          <StatCard
            title="Active Users"
            value="9"
            icon={<Users className="h-4 w-4" />}
            description="System users"
          />
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Recent Products</CardTitle>
              <CardDescription>
                Latest products added to your inventory
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading products...</div>
              ) : recentProducts.length > 0 ? (
                <div className="space-y-4">
                  {recentProducts.map((product, index) => (
                    <div key={`${product.prodcode}-${index}`} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                      <div>
                        <div className="font-medium">{product.prodcode}</div>
                        <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {product.description || "No description"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {product.unit || "No unit"} • Added {formatDate(product.created_at)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-right">
                          {formatPrice(product.unitprice)}
                        </span>
                        <Link to={`/products/${product.prodcode}/price-history`} className="text-muted-foreground hover:text-primary">
                          <ExternalLink size={14} />
                        </Link>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 text-right">
                    <Link to="/products" className="text-sm text-primary hover:underline">
                      View all products →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No products available yet.</div>
              )}
            </CardContent>
          </Card>
          
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Recent Price Updates</CardTitle>
              <CardDescription>
                Latest price changes in your products
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading price history...</div>
              ) : recentPriceChanges.length > 0 ? (
                <div className="space-y-4">
                  {recentPriceChanges.map((change, index) => (
                    <div key={`${change.prodcode}-${change.effdate}-${index}`} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                      <div>
                        <div className="font-medium">{change.prodcode}</div>
                        <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {change.description || "No description"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(change.effdate)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-right">
                          {formatPrice(change.unitprice)}
                        </span>
                        <Link to={`/products/${change.prodcode}/price-history`} className="text-muted-foreground hover:text-primary">
                          <ExternalLink size={14} />
                        </Link>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 text-right">
                    <Link to="/products" className="text-sm text-primary hover:underline">
                      View all products →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No price updates available yet.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
