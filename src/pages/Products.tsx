import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Package, Plus, Loader2, Search, History } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";

interface Product {
  prodcode: string;
  description: string | null;
  unit: string | null;
  currentPrice: number | null;
}

const Products = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const itemsPerPage = 10;

  const handleAddProduct = () => {
    toast({
      title: "Feature in development",
      description: "The ability to add products is coming soon!",
    });
  };

  const handleViewPriceHistory = (prodcode: string) => {
    navigate(`/products/${prodcode}/price-history`);
  };

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const { data: productsData, error: productsError } = await supabase
          .from('product')
          .select('*');

        if (productsError) throw productsError;

        if (productsData) {
          const productsWithPrices = await Promise.all(
            productsData.map(async (product) => {
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
                  currentPrice: null
                };
              }

              return {
                ...product,
                currentPrice: priceData && priceData.length > 0 ? priceData[0].unitprice : null
              };
            })
          );

          setProducts(productsWithPrices);
        }
      } catch (err: any) {
        console.error('Error fetching products:', err);
        setError(err.message);
        toast({
          title: "Error",
          description: "Failed to load products. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [toast]);

  const filteredProducts = searchQuery.trim() === "" 
    ? products 
    : products.filter(product => 
        product.prodcode.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (product.description?.toLowerCase() || "").includes(searchQuery.toLowerCase())
      );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  const formatPrice = (price: number | null): string => {
    if (price === null) return "N/A";
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Products</h2>
            <p className="text-muted-foreground">Manage your product catalog and pricing history.</p>
          </div>
          <Button onClick={handleAddProduct} className="gap-1">
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>

        <Card className="p-6">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search products by code or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="min-h-[300px] flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p>Loading products...</p>
            </div>
          ) : error ? (
            <div className="min-h-[300px] flex flex-col items-center justify-center text-center">
              <p className="text-destructive">Error loading products. Please try again.</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="min-h-[300px] flex flex-col items-center justify-center text-center p-8">
              {searchQuery ? (
                <>
                  <div className="rounded-full bg-gray-100 p-3 mb-4">
                    <Search className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No matching products found</h3>
                  <p className="text-muted-foreground max-w-sm">
                    Try adjusting your search terms or clear the search to see all products.
                  </p>
                </>
              ) : (
                <>
                  <div className="rounded-full bg-primary/10 p-3 mb-4">
                    <Package className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No products yet</h3>
                  <p className="text-muted-foreground max-w-sm mb-6">
                    Get started by adding your first product to track its price history.
                  </p>
                  <Button onClick={handleAddProduct} className="gap-1">
                    <Plus className="h-4 w-4" /> Add Your First Product
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Current Price</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedProducts.map((product) => (
                      <TableRow key={product.prodcode}>
                        <TableCell className="font-medium">{product.prodcode}</TableCell>
                        <TableCell>{product.description || "—"}</TableCell>
                        <TableCell>{product.unit || "—"}</TableCell>
                        <TableCell>{formatPrice(product.currentPrice)}</TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex items-center gap-1"
                            onClick={() => handleViewPriceHistory(product.prodcode)}
                          >
                            <History className="h-3.5 w-3.5" />
                            <span>Price History</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {totalPages > 1 && (
                <Pagination className="mt-4">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: totalPages }).map((_, index) => (
                      <PaginationItem key={index}>
                        <PaginationLink
                          isActive={currentPage === index + 1}
                          onClick={() => setCurrentPage(index + 1)}
                        >
                          {index + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Products;
