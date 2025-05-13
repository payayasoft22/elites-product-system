
import { useState } from "react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Product, PriceHistory } from "./types";
import { formSchema } from "@/components/products/ProductForm";
import { priceHistorySchema } from "@/components/products/PriceForm";

export const useProductActions = (fetchProducts: () => Promise<void>) => {
  const { toast } = useToast();
  
  // State variables for UI control
  const [isAddProductOpen, setIsAddProductOpen] = useState<boolean>(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState<boolean>(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isPriceHistorySheetOpen, setIsPriceHistorySheetOpen] = useState<boolean>(false);
  const [isAddPriceOpen, setIsAddPriceOpen] = useState<boolean>(false);
  const [isEditPriceOpen, setIsEditPriceOpen] = useState<boolean>(false);
  const [isDeletePriceOpen, setIsDeletePriceOpen] = useState<boolean>(false);
  const [selectedPrice, setSelectedPrice] = useState<PriceHistory | null>(null);
  const [tempProduct, setTempProduct] = useState<Product | null>(null);

  // CRUD operations
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const { error: productError } = await supabase
        .from('product')
        .insert({
          prodcode: values.prodcode,
          description: values.description,
          unit: values.unit
        });

      if (productError) throw productError;

      const { error: priceError } = await supabase
        .from('pricehist')
        .insert({
          prodcode: values.prodcode,
          unitprice: values.unitprice,
          effdate: new Date().toISOString().split('T')[0]
        });

      if (priceError) throw priceError;

      toast({
        title: "Product added successfully",
        description: `${values.prodcode} has been added to your products.`
      });

      resetProductState();
      fetchProducts();
    } catch (err: any) {
      console.error('Error adding product:', err);
      toast({
        title: "Error adding product",
        description: err.message || "Failed to add product. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onEdit = async (values: z.infer<typeof formSchema>) => {
    if (!selectedProduct) return;
    
    try {
      const { error: productError } = await supabase
        .from('product')
        .update({
          description: values.description,
          unit: values.unit
        })
        .eq('prodcode', selectedProduct.prodcode);

      if (productError) throw productError;

      if (values.unitprice !== selectedProduct.currentPrice) {
        const { error: priceError } = await supabase
          .from('pricehist')
          .insert({
            prodcode: selectedProduct.prodcode,
            unitprice: values.unitprice,
            effdate: new Date().toISOString().split('T')[0]
          });

        if (priceError) throw priceError;
      }

      toast({
        title: "Product updated successfully",
        description: `${selectedProduct.prodcode} has been updated.`
      });

      setIsEditProductOpen(false);
      setSelectedProduct(null);

      fetchProducts();
    } catch (err: any) {
      console.error('Error updating product:', err);
      toast({
        title: "Error updating product",
        description: err.message || "Failed to update product. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onDelete = async () => {
    if (!selectedProduct) return;
    
    try {
      const { error: priceHistError } = await supabase
        .from('pricehist')
        .delete()
        .eq('prodcode', selectedProduct.prodcode);

      if (priceHistError) throw priceHistError;

      const { error: productError } = await supabase
        .from('product')
        .delete()
        .eq('prodcode', selectedProduct.prodcode);

      if (productError) throw productError;

      toast({
        title: "Product deleted successfully",
        description: `${selectedProduct.prodcode} has been removed from your products.`
      });

      setIsDeleteConfirmOpen(false);
      setSelectedProduct(null);

      fetchProducts();
    } catch (err: any) {
      console.error('Error deleting product:', err);
      toast({
        title: "Error deleting product",
        description: err.message || "Failed to delete product. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onSubmitPrice = async (values: z.infer<typeof priceHistorySchema>, fetchPriceHistory: (prodcode: string) => Promise<void>) => {
    if (!tempProduct) return;
    
    try {
      const { error } = await supabase
        .from('pricehist')
        .insert({
          prodcode: tempProduct.prodcode,
          unitprice: values.unitprice,
          effdate: values.effdate
        });

      if (error) throw error;

      toast({
        title: "Price history added",
        description: "New price has been added successfully."
      });
      
      fetchPriceHistory(tempProduct.prodcode);
      
      setTempProduct({
        ...tempProduct,
        currentPrice: values.unitprice
      });
      
      setIsAddPriceOpen(false);
    } catch (err: any) {
      console.error('Error adding price history:', err);
      toast({
        title: "Error adding price",
        description: err.message || "Failed to add price. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onEditPrice = async (values: z.infer<typeof priceHistorySchema>, fetchPriceHistory: (prodcode: string) => Promise<void>, priceHistory: PriceHistory[]) => {
    if (!selectedPrice || !tempProduct) return;
    
    try {
      const { error } = await supabase
        .from('pricehist')
        .update({
          unitprice: values.unitprice,
          effdate: values.effdate
        })
        .eq('prodcode', selectedPrice.prodcode)
        .eq('effdate', selectedPrice.effdate);

      if (error) throw error;

      toast({
        title: "Price history updated",
        description: "Price has been updated successfully."
      });
      
      fetchPriceHistory(tempProduct.prodcode);
      
      if (priceHistory.length > 0 && priceHistory[0].effdate === selectedPrice.effdate) {
        setTempProduct({
          ...tempProduct,
          currentPrice: values.unitprice
        });
      }
      
      setIsEditPriceOpen(false);
      setSelectedPrice(null);
    } catch (err: any) {
      console.error('Error updating price history:', err);
      toast({
        title: "Error updating price",
        description: err.message || "Failed to update price. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onDeletePrice = async (fetchPriceHistory: (prodcode: string) => Promise<void>, priceHistory: PriceHistory[]) => {
    if (!selectedPrice || !tempProduct) return;
    
    try {
      const { error } = await supabase
        .from('pricehist')
        .delete()
        .eq('prodcode', selectedPrice.prodcode)
        .eq('effdate', selectedPrice.effdate);

      if (error) throw error;

      toast({
        title: "Price history deleted",
        description: "Price has been deleted successfully."
      });
      
      fetchPriceHistory(tempProduct.prodcode);
      
      if (priceHistory.length > 0 && priceHistory[0].effdate === selectedPrice.effdate) {
        const newCurrentPrice = priceHistory.length > 1 ? priceHistory[1].unitprice : 0;
        
        setTempProduct({
          ...tempProduct,
          currentPrice: newCurrentPrice
        });
      }
      
      setIsDeletePriceOpen(false);
      setSelectedPrice(null);
    } catch (err: any) {
      console.error('Error deleting price history:', err);
      toast({
        title: "Error deleting price",
        description: err.message || "Failed to delete price. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddProduct = () => {
    const tempProd: Product = {
      prodcode: "",
      description: "",
      unit: "",
      currentPrice: 0
    };
    setTempProduct(tempProd);
    setIsAddProductOpen(true);
  };

  const handleEditProduct = (product: Product) => {    
    setSelectedProduct(product);
    setIsEditProductOpen(true);
  };

  const handleDeleteProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteConfirmOpen(true);
  };

  const handleManagePriceHistory = (fetchPriceHistory: (prodcode: string) => Promise<void>) => {
    if (!tempProduct) return;
    
    if (tempProduct.prodcode) {
      fetchPriceHistory(tempProduct.prodcode);
    }
    
    setIsPriceHistorySheetOpen(true);
  };

  const handleAddPrice = () => {
    setIsAddPriceOpen(true);
  };

  const handleEditPrice = (price: PriceHistory) => {
    setSelectedPrice(price);
    setIsEditPriceOpen(true);
  };

  const handleDeletePrice = (price: PriceHistory) => {
    setSelectedPrice(price);
    setIsDeletePriceOpen(true);
  };

  const resetProductState = () => {
    setIsAddProductOpen(false);
    setTempProduct(null);
    setIsPriceHistorySheetOpen(false);
  };

  return {
    // State
    isAddProductOpen,
    setIsAddProductOpen,
    isEditProductOpen,
    setIsEditProductOpen,
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    selectedProduct,
    setSelectedProduct,
    isPriceHistorySheetOpen,
    setIsPriceHistorySheetOpen,
    isAddPriceOpen,
    setIsAddPriceOpen,
    isEditPriceOpen,
    setIsEditPriceOpen,
    isDeletePriceOpen,
    setIsDeletePriceOpen,
    selectedPrice,
    setSelectedPrice,
    tempProduct,
    setTempProduct,

    // Actions
    onSubmit,
    onEdit,
    onDelete,
    onSubmitPrice,
    onEditPrice,
    onDeletePrice,
    handleAddProduct,
    handleEditProduct,
    handleDeleteProduct,
    handleManagePriceHistory,
    handleAddPrice,
    handleEditPrice,
    handleDeletePrice,
    resetProductState
  };
};
