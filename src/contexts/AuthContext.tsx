import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  const [isPriceHistorySheetOpen, setIsPriceHistorySheetOpen] = useState<boolean>(false);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [isAddPriceOpen, setIsAddPriceOpen] = useState<boolean>(false);
  const [isEditPriceOpen, setIsEditPriceOpen] = useState<boolean>(false);
  const [isDeletePriceOpen, setIsDeletePriceOpen] = useState<boolean>(false);
  const [selectedPrice, setSelectedPrice] = useState<PriceHistory | null>(null);
  const [tempProduct, setTempProduct] = useState<Product | null>(null);
  const [validatingCode, setValidatingCode] = useState(false);
  const itemsPerPage = 10;

  // Data fetching
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data: productsData, error: productsError } = await supabase
        .from('product')
        .select('*')
        .order('prodcode', { ascending: true });

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

  const fetchPriceHistory = async (prodcode: string) => {
    try {
      const { data, error } = await supabase
        .from('pricehist')
        .select('*')
        .eq('prodcode', prodcode)
        .order('effdate', { ascending: false });

      if (error) throw error;
      
      setPriceHistory(data || []);
    } catch (err: any) {
      console.error('Error fetching price history:', err);
      toast({
        title: "Error",
        description: "Failed to load price history. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);
