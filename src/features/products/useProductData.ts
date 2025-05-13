
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Product, PriceHistory } from "./types";

export const useProductData = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  
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
  }, [toast]);

  return {
    products,
    loading,
    error,
    priceHistory,
    setPriceHistory,
    fetchProducts,
    fetchPriceHistory
  };
};
