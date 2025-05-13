
import React from "react";
import { Product } from "@/features/products/types";
import { ProductListProps } from "./types/ProductListTypes";
import ProductSearch from "./ProductSearch";
import ProductLoadingState from "./ProductLoadingState";
import ProductErrorState from "./ProductErrorState";
import ProductEmptyState from "./ProductEmptyState";
import ProductTable from "./ProductTable";
import ProductPagination from "./ProductPagination";
import { formatPrice } from "./utils/formatters";

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
  handleDeleteProduct,
  canAddProduct = true,
  canEditProduct = true,
  canDeleteProduct = true
}: ProductListProps) => {

  const filteredProducts = searchQuery.trim() === "" 
    ? products 
    : products.filter(product => 
        product.prodcode.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (product.description?.toLowerCase() || "").includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => a.prodcode.localeCompare(b.prodcode));

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div>
      <ProductSearch 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
      />

      {loading ? (
        <ProductLoadingState />
      ) : error ? (
        <ProductErrorState />
      ) : filteredProducts.length === 0 ? (
        <ProductEmptyState 
          searchQuery={searchQuery} 
          handleAddProduct={handleAddProduct} 
          canAddProduct={canAddProduct} 
        />
      ) : (
        <div>
          <ProductTable 
            products={paginatedProducts}
            handleEditProduct={handleEditProduct}
            handleDeleteProduct={handleDeleteProduct}
            canEditProduct={canEditProduct}
            canDeleteProduct={canDeleteProduct}
            formatPrice={formatPrice}
          />
          
          <ProductPagination 
            currentPage={currentPage}
            totalPages={totalPages}
            setCurrentPage={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
};

export default ProductList;
