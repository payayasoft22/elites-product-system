
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import * as z from "zod";

// Import refactored hooks and components
import { useProductData } from "@/features/products/useProductData";
import { useProductActions } from "@/features/products/useProductActions";
import { usePermissionCheck } from "@/features/products/usePermissionCheck";

// Import the original components
import ProductList from "@/components/products/ProductList";
import ProductForm from "@/components/products/ProductForm";
import PriceHistorySheet from "@/components/products/PriceHistorySheet";
import PriceForm from "@/components/products/PriceForm";
import DeleteConfirmDialog from "@/components/products/DeleteConfirmDialog";
import { useToast } from "@/hooks/use-toast";

const Products = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Custom hooks
  const { 
    products, 
    loading, 
    error, 
    priceHistory, 
    fetchProducts, 
    fetchPriceHistory 
  } = useProductData();
  
  const {
    isAddProductOpen,
    setIsAddProductOpen,
    isEditProductOpen,
    setIsEditProductOpen,
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    selectedProduct,
    isPriceHistorySheetOpen,
    setIsPriceHistorySheetOpen,
    isAddPriceOpen,
    setIsAddPriceOpen,
    isEditPriceOpen,
    setIsEditPriceOpen,
    isDeletePriceOpen,
    setIsDeletePriceOpen,
    selectedPrice,
    tempProduct,
    setTempProduct,
    
    onSubmit,
    onEdit,
    onDelete,
    onSubmitPrice,
    onEditPrice,
    onDeletePrice,
    handleAddProduct: baseHandleAddProduct,
    handleEditProduct: baseHandleEditProduct,
    handleDeleteProduct: baseHandleDeleteProduct,
    handleManagePriceHistory: baseHandleManagePriceHistory,
    handleAddPrice: baseHandleAddPrice,
    handleEditPrice: baseHandleEditPrice,
    handleDeletePrice: baseHandleDeletePrice
  } = useProductActions(fetchProducts);

  const {
    canAddProduct,
    canEditProduct,
    canDeleteProduct,
    canAddPriceHistory,
    canEditPriceHistory,
    canDeletePriceHistory,
    isAdmin,
    permissionsLoading
  } = usePermissionCheck();
  
  // State for pagination and search
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const itemsPerPage = 10;

  // Event handlers with permission checks
  const handleAddProduct = () => {
    if (!canAddProduct) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to add products.",
        variant: "destructive",
      });
      return;
    }
    baseHandleAddProduct();
  };

  const handleEditProduct = (product: any) => {
    if (!canEditProduct) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to edit products.",
        variant: "destructive",
      });
      return;
    }
    baseHandleEditProduct(product);
  };

  const handleDeleteProduct = (product: any) => {
    if (!canDeleteProduct) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to delete products.",
        variant: "destructive",
      });
      return;
    }
    baseHandleDeleteProduct(product);
  };

  const handleManagePriceHistory = () => {
    baseHandleManagePriceHistory(fetchPriceHistory);
  };

  const handleAddPrice = () => {
    if (!canAddPriceHistory) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to add price history.",
        variant: "destructive",
      });
      return;
    }
    baseHandleAddPrice();
  };

  const handleEditPrice = (price: any) => {
    if (!canEditPriceHistory) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to edit price history.",
        variant: "destructive",
      });
      return;
    }
    baseHandleEditPrice(price);
  };

  const handleDeletePrice = (price: any) => {
    if (!canDeletePriceHistory) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to delete price history.",
        variant: "destructive",
      });
      return;
    }
    baseHandleDeletePrice(price);
  };

  // Effects to handle pagination when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);
  
  return (
    <DashboardLayout>
      <div className="space-y-6 w-full">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Products</h2>
            <p className="text-muted-foreground">Manage your product catalog and pricing history.</p>
          </div>
          <Button 
            onClick={handleAddProduct} 
            className="gap-1"
            disabled={!canAddProduct}
          >
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>

        {!permissionsLoading && !isAdmin && !canAddProduct && !canEditProduct && !canDeleteProduct && (
          <Alert variant="default" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Limited Access</AlertTitle>
            <AlertDescription>
              You currently don't have permissions to manage products. Please contact an administrator to request access.
            </AlertDescription>
          </Alert>
        )}

        <Card className="p-6">
          <ProductList 
            products={products}
            loading={loading}
            error={error}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            itemsPerPage={itemsPerPage}
            handleAddProduct={handleAddProduct}
            handleEditProduct={handleEditProduct}
            handleDeleteProduct={handleDeleteProduct}
            canAddProduct={canAddProduct}
            canEditProduct={canEditProduct}
            canDeleteProduct={canDeleteProduct}
          />
        </Card>
      </div>

      {/* Add Product Dialog */}
      <Dialog open={isAddProductOpen} onOpenChange={(open) => {
        setIsAddProductOpen(open);
        if (!open) {
          setTempProduct(null);
          setIsPriceHistorySheetOpen(false);
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
          </DialogHeader>
          <ProductForm 
            onSubmit={onSubmit}
            onCancel={() => setIsAddProductOpen(false)}
            onManagePriceHistory={handleManagePriceHistory}
            tempProduct={tempProduct}
            setTempProduct={setTempProduct}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditProductOpen} onOpenChange={setIsEditProductOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          <ProductForm 
            onSubmit={onEdit}
            isEdit={true}
            product={selectedProduct}
            onCancel={() => setIsEditProductOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Product Confirm Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
          </DialogHeader>
          <DeleteConfirmDialog
            itemType="Product"
            itemName={selectedProduct?.prodcode || ""}
            onDelete={onDelete}
            onCancel={() => setIsDeleteConfirmOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Price History Sheet */}
      <PriceHistorySheet
        isOpen={isPriceHistorySheetOpen}
        onOpenChange={setIsPriceHistorySheetOpen}
        tempProduct={tempProduct}
        priceHistory={priceHistory}
        onAddPrice={handleAddPrice}
        onEditPrice={handleEditPrice}
        onDeletePrice={handleDeletePrice}
        canAddPriceHistory={canAddPriceHistory}
        canEditPriceHistory={canEditPriceHistory}
        canDeletePriceHistory={canDeletePriceHistory}
      />

      {/* Add Price Dialog */}
      <Dialog open={isAddPriceOpen} onOpenChange={setIsAddPriceOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Price History</DialogTitle>
            <DialogDescription>
              Add a new price entry for {tempProduct?.prodcode}.
            </DialogDescription>
          </DialogHeader>
          <PriceForm
            onSubmit={(values) => onSubmitPrice(values, fetchPriceHistory)}
            onCancel={() => setIsAddPriceOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Price Dialog */}
      <Dialog open={isEditPriceOpen} onOpenChange={setIsEditPriceOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Price History</DialogTitle>
            <DialogDescription>
              Edit price entry for {tempProduct?.prodcode}.
            </DialogDescription>
          </DialogHeader>
          <PriceForm
            onSubmit={(values) => onEditPrice(values, fetchPriceHistory, priceHistory)}
            isEdit={true}
            initialPrice={selectedPrice?.unitprice || 0}
            initialDate={selectedPrice?.effdate || ""}
            onCancel={() => setIsEditPriceOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Price Confirm Dialog */}
      <Dialog open={isDeletePriceOpen} onOpenChange={setIsDeletePriceOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Price History</DialogTitle>
          </DialogHeader>
          <DeleteConfirmDialog
            itemType="Price"
            itemName={`for ${tempProduct?.prodcode || ""} on ${selectedPrice ? new Date(selectedPrice.effdate).toLocaleDateString() : ""}`}
            onDelete={() => onDeletePrice(fetchPriceHistory, priceHistory)}
            onCancel={() => setIsDeletePriceOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Products;
