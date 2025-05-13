
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "../schemas/productSchema";
import { Product } from "@/features/products/types";

interface ProductCodeFieldProps {
  form: UseFormReturn<ProductFormValues>;
  isEdit: boolean;
  tempProduct?: Product | null;
  setTempProduct?: (product: Product | null) => void;
}

const ProductCodeField = ({ form, isEdit, tempProduct, setTempProduct }: ProductCodeFieldProps) => {
  return (
    <FormField
      control={form.control}
      name="prodcode"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Product Code</FormLabel>
          <FormControl>
            <Input 
              placeholder="Enter product code" 
              {...field} 
              disabled={isEdit}
              onChange={(e) => {
                field.onChange(e);
                if (setTempProduct && tempProduct) {
                  setTempProduct({
                    ...tempProduct,
                    prodcode: e.target.value
                  });
                }
              }}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default ProductCodeField;
