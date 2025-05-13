
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "../schemas/productSchema";
import { Product } from "@/features/products/types";

interface PriceFieldProps {
  form: UseFormReturn<ProductFormValues>;
  isEdit: boolean;
  onManagePriceHistory?: () => void;
  tempProduct?: Product | null;
  setTempProduct?: (product: Product | null) => void;
}

const PriceField = ({ 
  form, 
  isEdit, 
  onManagePriceHistory, 
  tempProduct, 
  setTempProduct 
}: PriceFieldProps) => {
  return (
    <FormField
      control={form.control}
      name="unitprice"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{isEdit ? "Price" : "Initial Price"}</FormLabel>
          <div className="space-y-2">
            <FormControl>
              <Input 
                type="number" 
                min="0.01" 
                step="0.01" 
                placeholder="0.00" 
                {...field} 
                onChange={(e) => {
                  field.onChange(e);
                  if (setTempProduct && tempProduct) {
                    const value = parseFloat(e.target.value);
                    setTempProduct({
                      ...tempProduct,
                      currentPrice: isNaN(value) ? 0 : value
                    });
                  }
                }}
              />
            </FormControl>
            {!isEdit && onManagePriceHistory && (
              <Button 
                type="button" 
                variant="outline" 
                className="w-full flex items-center justify-center gap-2"
                onClick={onManagePriceHistory}
                disabled={!tempProduct?.prodcode}
              >
                <Clock className="h-4 w-4" />
                Manage Price History
              </Button>
            )}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default PriceField;
