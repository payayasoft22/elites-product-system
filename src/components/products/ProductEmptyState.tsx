
import React from "react";
import { Package, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProductEmptyStateProps {
  searchQuery: string;
  handleAddProduct: () => void;
  canAddProduct: boolean;
}

const ProductEmptyState = ({ 
  searchQuery, 
  handleAddProduct, 
  canAddProduct 
}: ProductEmptyStateProps) => {
  if (searchQuery) {
    return (
      <div className="min-h-[300px] flex flex-col items-center justify-center text-center p-8">
        <div className="rounded-full bg-gray-100 p-3 mb-4">
          <Search className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No matching products found</h3>
        <p className="text-muted-foreground max-w-sm">
          Try adjusting your search terms or clear the search to see all products.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[300px] flex flex-col items-center justify-center text-center p-8">
      <div className="rounded-full bg-primary/10 p-3 mb-4">
        <Package className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-xl font-semibold mb-2">No products yet</h3>
      <p className="text-muted-foreground max-w-sm mb-6">
        Get started by adding your first product to track its price history.
      </p>
      {canAddProduct && (
        <Button onClick={handleAddProduct} className="gap-1">
          <Plus className="h-4 w-4" /> Add Your First Product
        </Button>
      )}
    </div>
  );
};

export default ProductEmptyState;
