
import React from "react";
import { useNavigate } from "react-router-dom";
import { Edit, Trash, History } from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Product } from "@/features/products/types";

interface ProductTableRowProps {
  product: Product;
  handleEditProduct: (product: Product) => void;
  handleDeleteProduct: (product: Product) => void;
  canEditProduct: boolean;
  canDeleteProduct: boolean;
  formatPrice: (price: number | null) => string;
}

const ProductTableRow = ({
  product,
  handleEditProduct,
  handleDeleteProduct,
  canEditProduct,
  canDeleteProduct,
  formatPrice
}: ProductTableRowProps) => {
  const navigate = useNavigate();

  return (
    <TableRow>
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
          
          {canEditProduct && (
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center gap-1"
              onClick={() => handleEditProduct(product)}
            >
              <Edit className="h-3.5 w-3.5" />
              <span>Edit</span>
            </Button>
          )}
          
          {canDeleteProduct && (
            <Button 
              variant="outline" 
              size="sm"
              className="flex items-center gap-1 text-destructive hover:text-destructive"
              onClick={() => handleDeleteProduct(product)}
            >
              <Trash className="h-3.5 w-3.5" />
              <span>Delete</span>
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

export default ProductTableRow;
