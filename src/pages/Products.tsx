import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import * as z from "zod";

// Import components
import ProductList from "@/components/products/ProductList";
import ProductForm, { formSchema } from "@/components/products/ProductForm";
import PriceHistorySheet from "@/components/products/PriceHistorySheet";
import PriceForm, { priceHistorySchema } from "@/components/products/PriceForm";
import DeleteConfirmDialog from "@/components/products/DeleteConfirmDialog";
import { Product, PriceHistory } from "@/components/products/types";

const Products = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

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
  const [isPriceHistorySheetOpen, setIsPriceHistorySheetOpen] =
    useState<boolean>(false);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [isAddPriceOpen, setIsAddPriceOpen] = useState<boolean>(false);
  const [isEditPriceOpen, setIsEditPriceOpen] = useState<boolean>(false);
  const [isDeletePriceOpen, setIsDeletePriceOpen] = useState<boolean>(false);
  const [selectedPrice, setSelectedPrice] = useState<PriceHistory | null>(null);
  const [tempProduct, setTempProduct] = useState<Product | null>(null);
  const itemsPerPage = 10;

  // Open Add Product dialog and reset temp product
  const handleAddProduct = () => {
    const tempProd: Product = {
      prodcode: "",
      description: "",
      unit: "",
      currentPrice: 0,
    };
    setTempProduct(tempProd);
    setIsAddProductOpen(true);
  };

  // Open Edit Product dialog and set selected product
  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsEditProductOpen(true);
  };

  // Open Delete Product confirmation dialog
  const handleDeleteProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteConfirmOpen(true);
  };

  // Open Price History Sheet for the product
  const handleManagePriceHistory = () => {
    if (!tempProduct) return;
    if (tempProduct.prodcode) {
      fetchPriceHistory(tempProduct.prodcode);
      setIsPriceHistorySheetOpen(true);
    }
  };

  // Price History dialog handlers
  const handleAddPrice = () => setIsAddPriceOpen(true);
  const handleEditPrice = (price: PriceHistory) => {
    setSelectedPrice(price);
    setIsEditPriceOpen(true);
  };
  const handleDeletePrice = (price: PriceHistory) => {
    setSelectedPrice(price);
    setIsDeletePriceOpen(true);
  };

  // Add new product with price
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      // Check if product code exists
      const { data: existingProduct, error: checkError } = await supabase
        .from("product")
        .select("prodcode")
        .eq("prodcode", values.prodcode)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingProduct) {
        throw new Error(`Product with code ${values.prodcode} already exists`);
      }

      // Insert product
      const { error: productError } = await supabase.from("product").insert({
        prodcode: values.prodcode,
        description: values.description,
        unit: values.unit,
      });
      if (productError) throw productError;

      // Insert initial price
      const { error: priceError } = await supabase.from("pricehist").insert({
        prodcode: values.prodcode,
        unitprice: values.unitprice,
        effdate: new Date().toISOString().split("T")[0],
      });
      if (priceError) {
        // Rollback product insertion if price insert fails
        await supabase.from("product").delete().eq("prodcode", values.prodcode);
        throw priceError;
      }

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

  // Edit product details and possibly add new price
  const onEdit = async (values: z.infer<typeof formSchema>) => {
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

      // If price changed, add new price history entry
      if (values.unitprice !== selectedProduct.currentPrice) {
        const { error: priceError } = await supabase.from("pricehist").insert({
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

  // Delete product and its price history
  const onDelete = async () => {
    if (!selectedProduct) return;

    try {
      // Delete price history first
      const { error: priceHistError } = await supabase
        .from("pricehist")
        .delete()
        .eq("prodcode", selectedProduct.prodcode);
      if (priceHistError) throw priceHistError;

      // Delete product
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

  // Fetch all products with latest prices
  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
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
              console.error(
                `Error fetching price for ${product.prodcode}:`,
                priceError
              );
              return {
                ...product,
                currentPrice: null,
              };
            }

            return {
              ...product,
              currentPrice:
                priceData && priceData.length > 0 ? priceData[0].unitprice : 0,
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

  // Fetch price history for a product
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

  // On component mount, fetch products
  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-semibold">Products</h2>
          <Button
            variant="default"
            size="sm"
            className="gap-2"
            onClick={handleAddProduct}
          >
            <Plus size={18} />
            Add Product
          </Button>
        </div>

        {error && <p className="text-red-600">{error}</p>}

        {/* Product List */}
        <ProductList
          products={products}
          loading={loading}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          onEdit={handleEditProduct}
          onDelete={handleDeleteProduct}
          onManagePrice={async (product) => {
            setTempProduct(product);
            fetchPriceHistory(product.prodcode);
            setIsPriceHistorySheetOpen(true);
          }}
          onSearch={(query) => {
            setSearchQuery(query);
            setCurrentPage(1);
          }}
        />

        {/* Add Product Dialog */}
        <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Product</DialogTitle>
              <DialogDescription>
                Fill in product details and price.
              </DialogDescription>
            </DialogHeader>
            {tempProduct && (
              <ProductForm
                defaultValues={tempProduct}
                onSubmit={onSubmit}
                onCancel={() => setIsAddProductOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Product Dialog */}
        <Dialog open={isEditProductOpen} onOpenChange={setIsEditProductOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription>
                Update product details and price.
              </DialogDescription>
            </DialogHeader>
            {selectedProduct && (
              <ProductForm
                defaultValues={selectedProduct}
                onSubmit={onEdit}
                onCancel={() => setIsEditProductOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmDialog
          open={isDeleteConfirmOpen}
          onClose={() => setIsDeleteConfirmOpen(false)}
          onConfirm={onDelete}
          title="Delete Product"
          description={`Are you sure you want to delete product ${selectedProduct?.prodcode}? This action cannot be undone.`}
        />

        {/* Price History Sheet */}
        <PriceHistorySheet
          open={isPriceHistorySheetOpen}
          onOpenChange={setIsPriceHistorySheetOpen}
          priceHistory={priceHistory}
          onAddPrice={() => setIsAddPriceOpen(true)}
          onEditPrice={handleEditPrice}
          onDeletePrice={handleDeletePrice}
        />

        {/* Add/Edit/Delete Price Dialogs (You can add these as needed) */}
        {/* Implement PriceForm and dialogs for price add/edit/delete here */}
      </div>
    </DashboardLayout>
  );
};

export default Products;
