import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { usePermission } from "@/hooks/usePermission";

// Import the extracted components
import ProductList from "@/components/products/ProductList";
import ProductForm, { formSchema } from "@/components/products/ProductForm";
import PriceHistorySheet from "@/components/products/PriceHistorySheet";
import PriceForm, { priceHistorySchema } from "@/components/products/PriceForm";
import DeleteConfirmDialog from "@/components/products/DeleteConfirmDialog";
import { Product, PriceHistory } from "@/components/products/types";

const Products = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    isAdmin,
    canAddProduct,
    canEditProduct,
    canDeleteProduct,
    canAddPriceHistory,
    canEditPriceHistory,
    canDeletePriceHistory
  } = usePermission();

  // State variables
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isAddProductOpen, setIsAddProductOpen] = useState<boolean>(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState<boolean>(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isPriceHistorySheetOpen, setIsPriceHistorySheetOpen] = useState<boolean>(false);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [isAddPriceOpen, setIsAddPriceOpen] = useState<boolean>(false);
  const [isEditPriceOpen, setIsEditPriceOpen] = useState<boolean>(false);
  const [isDeletePriceOpen, setIsDeletePriceOpen] = useState<boolean>(false);
  const [selectedPrice, setSelectedPrice] = useState<PriceHistory | null>(null);
  const [tempProduct, setTempProduct] = useState<Product | null>(null);
  const itemsPerPage = 10;

  const showPermissionDenied = () => {
    toast({
      title: "Permission Denied",
      description: "You don't have permission to perform this action",
      variant: "destructive",
    });
  };

  // Event handlers
  const handleAddProduct = () => {
    if (!canAddProduct && !isAdmin) {
      showPermissionDenied();
      return;
    }
    const tempProd: Product = {
      prodcode: "",
      description: "",
      unit: "",
      currentPrice: 0,
    };
    setTempProduct(tempProd);
    setIsAddProductOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    if (!canEditProduct && !isAdmin) {
      showPermissionDenied();
      return;
    }
    setSelectedProduct(product);
    setIsEditProductOpen(true);
  };

  const handleDeleteProduct = (product: Product) => {
    if (!canDeleteProduct && !isAdmin) {
      showPermissionDenied();
      return;
    }
    setSelectedProduct(product);
    setIsDeleteConfirmOpen(true);
  };

  const handleManagePriceHistory = () => {
    if (!canAddPriceHistory && !canEditPriceHistory && !canDeletePriceHistory && !isAdmin) {
      showPermissionDenied();
      return;
    }
    if (!tempProduct) return;

    if (tempProduct.prodcode) {
      fetchPriceHistory(tempProduct.prodcode);
    }
    setIsPriceHistorySheetOpen(true);
  };

  const handleAddPrice = () => {
    if (!canAddPriceHistory && !isAdmin) {
      showPermissionDenied();
      return;
    }
    setIsAddPriceOpen(true);
  };

  const handleEditPrice = (price: PriceHistory) => {
    if (!canEditPriceHistory && !isAdmin) {
      showPermissionDenied();
      return;
    }
    setSelectedPrice(price);
    setIsEditPriceOpen(true);
  };

  const handleDeletePrice = (price: PriceHistory) => {
    if (!canDeletePriceHistory && !isAdmin) {
      showPermissionDenied();
      return;
    }
    setSelectedPrice(price);
    setIsDeletePriceOpen(true);
  };

  const handleViewPriceHistory = (prodcode: string) => {
    navigate(`/price-history/${prodcode}`);
  };

  // CRUD operations
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (!canAddProduct && !isAdmin) {
        showPermissionDenied();
        return;
      }

      const { error: productError } = await supabase
        .from("product")
        .insert({
          prodcode: values.prodcode,
          description: values.description,
          unit: values.unit,
        });

      if (productError) throw productError;

      const { error: priceError } = await supabase
        .from("pricehist")
        .insert({
          prodcode: values.prodcode,
          unitprice: values.unitprice,
          effdate: new Date().toISOString().split("T")[0],
        });

      if (priceError) throw priceError;

      toast({
        title: "Product added successfully",
        description: `${values.prodcode} has been added to your products.`,
      });

      setIsAddProductOpen(false);
      setTempProduct(null);
      setIsPriceHistorySheetOpen(false);
      setPriceHistory([]);

      fetchProducts();
    } catch (err: any) {
      console.error("Error adding product:", err);
      toast({
        title: "Error adding product",
        description: err.message || "Failed to add product. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onEdit = async (values: z.infer<typeof formSchema>) => {
    if (!canEditProduct && !isAdmin) {
      showPermissionDenied();
      return;
    }
    if (!selectedProduct) return;

    try {
      const { error: productError } = await supabase
        .from("product")
        .update({
          description: values.description,
          unit: values.unit,
        })
        .eq("prodcode", selectedProduct.prodcode);

      if (productError) throw productError;

      if (values.unitprice !== selectedProduct.currentPrice) {
        const { error: priceError } = await supabase
          .from("pricehist")
          .insert({
            prodcode: selectedProduct.prodcode,
            unitprice: values.unitprice,
            effdate: new Date().toISOString().split("T")[0],
          });

        if (priceError) throw priceError;
      }

      toast({
        title: "Product updated successfully",
        description: `${selectedProduct.prodcode} has been updated.`,
      });

      setIsEditProductOpen(false);
      setSelectedProduct(null);

      fetchProducts();
    } catch (err: any) {
      console.error("Error updating product:", err);
      toast({
        title: "Error updating product",
        description: err.message || "Failed to update product. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onDelete = async () => {
    if (!canDeleteProduct && !isAdmin) {
      showPermissionDenied();
      return;
    }
    if (!selectedProduct) return;

    try {
      const { error: priceHistError } = await supabase
        .from("pricehist")
        .delete()
        .eq("prodcode", selectedProduct.prodcode);

      if (priceHistError) throw priceHistError;

      const { error: productError } = await supabase
        .from("product")
        .delete()
        .eq("prodcode", selectedProduct.prodcode);

      if (productError) throw productError;

      toast({
        title: "Product deleted successfully",
        description: `${selectedProduct.prodcode} has been removed from your products.`,
      });

      setIsDeleteConfirmOpen(false);
      setSelectedProduct(null);

      fetchProducts();
    } catch (err: any) {
      console.error("Error deleting product:", err);
      toast({
        title: "Error deleting product",
        description: err.message || "Failed to delete product. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Data fetching
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data: productsData, error: productsError } = await supabase
        .from("product")
        .select("*")
        .order("prodcode", { ascending: true });

      if (productsError) throw productsError;

      if (productsData) {
        const productsWithPrices = await Promise.all(
          productsData.map(async (product) => {
            const { data: priceData, error: priceError } = await supabase
              .from("pricehist")
              .select("unitprice, effdate")
              .eq("prodcode", product.prodcode)
              .order("effdate", { ascending: false })
              .limit(1);

            if (priceError) {
              console.error(`Error fetching price for ${product.prodcode}:`, priceError);
              return {
                ...product,
                currentPrice: null,
              };
            }

            return {
              ...product,
              currentPrice: priceData && priceData.length > 0 ? priceData[0].unitprice : null,
            };
          })
        );

        setProducts(productsWithPrices);
      }
    } catch (err: any) {
      console.error("Error fetching products:", err);
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

  const fetchPriceHistory = async (prodcode: string) => {
    try {
      const { data, error } = await supabase
        .from("pricehist")
        .select("*")
        .eq("prodcode", prodcode)
        .order("effdate", { ascending: false });

      if (error) throw error;

      setPriceHistory(data || []);
    } catch (err: any) {
      console.error("Error fetching price history:", err);
      toast({
        title: "Error",
        description: "Failed to load price history. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onSubmitPrice = async (values: z.infer<typeof priceHistorySchema>) => {
    if (!canAddPriceHistory && !isAdmin) {
      showPermissionDenied();
      return;
    }
    if (!tempProduct) return;

    try {
      const { error } = await supabase
        .from("pricehist")
        .insert({
          prodcode: tempProduct.prodcode,
          unitprice: values.unitprice,
          effdate: values.effdate,
        });

      if (error) throw error;

      toast({
        title: "Price history added",
        description: "New price has been added successfully.",
      });

      fetchPriceHistory(tempProduct.prodcode);

      setTempProduct({
        ...tempProduct,
        currentPrice: values.unitprice,
      });

      setIsAddPriceOpen(false);
    } catch (err: any) {
      console.error("Error adding price history:", err);
      toast({
        title: "Error adding price",
        description: err.message || "Failed to add price. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onEditPrice = async (values: z.infer<typeof priceHistorySchema>) => {
    if (!canEditPriceHistory && !isAdmin) {
      showPermissionDenied();
      return;
    }
    if (!selectedPrice || !tempProduct) return;

    try {
      const { error } = await supabase
        .from("pricehist")
        .update({
          unitprice: values.unitprice,
          effdate: values.effdate,
        })
        .eq("prodcode", selectedPrice.prodcode)
        .eq("effdate", selectedPrice.effdate);

      if (error) throw error;

      toast({
        title: "Price history updated",
        description: "Price has been updated successfully.",
      });

      fetchPriceHistory(tempProduct.prodcode);

      if (priceHistory.length > 0 && priceHistory[0].effdate === selectedPrice.effdate) {
        setTempProduct({
          ...tempProduct,
          currentPrice: values.unitprice,
        });
      }

      setIsEditPriceOpen(false);
      setSelectedPrice(null);
    } catch (err: any) {
      console.error("Error updating price history:", err);
      toast({
        title: "Error updating price",
        description: err.message || "Failed to update price. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onDeletePrice = async () => {
    if (!canDeletePriceHistory && !isAdmin) {
      showPermissionDenied();
      return;
    }
    if (!selectedPrice || !tempProduct) return;

    try {
      const { error } = await supabase
        .from("pricehist")
        .delete()
        .eq("prodcode", selectedPrice.prodcode)
        .eq("effdate", selectedPrice.effdate);

      if (error) throw error;

      toast({
        title: "Price history deleted",
        description: "Price has been deleted successfully.",
      });

      fetchPriceHistory(tempProduct.prodcode);

      if (priceHistory.length > 0 && priceHistory[0].effdate === selectedPrice.effdate) {
        const newCurrentPrice = priceHistory.length > 1 ? priceHistory[1].unitprice : 0;

        setTempProduct({
          ...tempProduct,
          currentPrice: newCurrentPrice,
        });
      }

      setIsDeletePriceOpen(false);
      setSelectedPrice(null);
    } catch (err: any) {
      console.error("Error deleting price history:", err);
      toast({
        title: "Error deleting price",
        description: err.message || "Failed to delete price. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Effects
  useEffect(() => {
    fetchProducts();
  }, [toast]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Products</h2>
            <p className="text-muted-foreground">Manage your product catalog and pricing history.</p>
          </div>
          <Button 
            onClick={handleAddProduct} 
            className="gap-1"
            disabled={!canAddProduct && !isAdmin}
          >
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>

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
            handleViewPriceHistory={handleViewPriceHistory}
            canEditProduct={canEditProduct || isAdmin}
            canDeleteProduct={canDeleteProduct || isAdmin}
          />
        </Card>
      </div>

      {/* Add Product Dialog */}
      <Dialog
        open={isAddProductOpen}
        onOpenChange={(open) => {
          setIsAddProductOpen(open);
          if (!open) {
            setTempProduct(null);
            setIsPriceHistorySheetOpen(false);
            setPriceHistory([]);
          }
        }}
      >
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
            canAddPriceHistory={canAddPriceHistory || isAdmin}
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
            canAddPriceHistory={canAddPriceHistory || isAdmin}
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
        canAddPriceHistory={canAddPriceHistory || isAdmin}
        canEditPriceHistory={canEditPriceHistory || isAdmin}
        canDeletePriceHistory={canDeletePriceHistory || isAdmin}
      />

      {/* Add Price Dialog */}
      <Dialog open={isAddPriceOpen} onOpenChange={setIsAddPriceOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Price History</DialogTitle>
            <DialogDescription>Add a new price entry for {tempProduct?.prodcode}.</DialogDescription>
          </DialogHeader>
          <PriceForm 
            onSubmit={onSubmitPrice} 
            onCancel={() => setIsAddPriceOpen(false)} 
          />
        </DialogContent>
      </Dialog>

      {/* Edit Price Dialog */}
      <Dialog open={isEditPriceOpen} onOpenChange={setIsEditPriceOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Price History</DialogTitle>
            <DialogDescription>Edit price entry for {tempProduct?.prodcode}.</DialogDescription>
          </DialogHeader>
          <PriceForm 
            onSubmit={onEditPrice} 
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
            onDelete={onDeletePrice}
            onCancel={() => setIsDeletePriceOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Products;
