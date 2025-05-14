
import React from "react";
import { useNavigate } from "react-router-dom";
import { Package, Plus, Loader2, Search, Edit, Trash, History } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Product {
  prodcode: string;
  description: string | null;
  unit: string | null;
  currentPrice: number | null;
}

interface ProductListProps {
  products: Product[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  itemsPerPage: number;
  handleAddProduct: () => void;
  handleEditProduct: (product: Product) => void;
  handleDeleteProduct: (product: Product) => void;
}

const ProductList = ({
  products,
  loading,
  error,
  searchQuery,
  setSearchQuery,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  handleAddProduct,
  handleEditProduct,
  handleDeleteProduct
}: ProductListProps) => {
  const navigate = useNavigate();

  const filteredProducts = searchQuery.trim() === "" 
    ? products 
    : products.filter(product => 
        product.prodcode.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (product.description?.toLowerCase() || "").includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => a.prodcode.localeCompare(b.prodcode)); // Sort filtered results alphabetically

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  const formatPrice = (price: number | null): string => {
    if (price === null) return "N/A";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  return (
    <div>
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
                  <TableHead>Product Name</TableHead>
                  <TableHead>Type</TableHead>
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
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex items-center gap-1"
                          onClick={() => navigate(`/products/${product.prodcode}/price-history`)}
                        >
                          <History className="h-3.5 w-3.5" />
                          <span>Price History</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex items-center gap-1"
                          onClick={() => handleEditProduct(product)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex items-center gap-1 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteProduct(product)}
                        >
                          <Trash className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </Button>
                      </div>
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
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
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
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductList;
