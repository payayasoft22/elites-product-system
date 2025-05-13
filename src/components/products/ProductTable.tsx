
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Product } from "@/features/products/types";
import ProductTableRow from "./ProductTableRow";

interface ProductTableProps {
  products: Product[];
  handleEditProduct: (product: Product) => void;
  handleDeleteProduct: (product: Product) => void;
  canEditProduct: boolean;
  canDeleteProduct: boolean;
  formatPrice: (price: number | null) => string;
}

const ProductTable = ({
  products,
  handleEditProduct,
  handleDeleteProduct,
  canEditProduct,
  canDeleteProduct,
  formatPrice
}: ProductTableProps) => {
  return (
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
          {products.map((product) => (
            <ProductTableRow
              key={product.prodcode}
              product={product}
              handleEditProduct={handleEditProduct}
              handleDeleteProduct={handleDeleteProduct}
              canEditProduct={canEditProduct}
              canDeleteProduct={canDeleteProduct}
              formatPrice={formatPrice}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ProductTable;
