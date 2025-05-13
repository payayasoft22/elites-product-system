
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "../schemas/productSchema";
import { Product } from "@/features/products/types";

interface UnitFieldProps {
  form: UseFormReturn<ProductFormValues>;
  tempProduct?: Product | null;
  setTempProduct?: (product: Product | null) => void;
}

const UnitField = ({ form, tempProduct, setTempProduct }: UnitFieldProps) => {
  return (
    <FormField
      control={form.control}
      name="unit"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Unit</FormLabel>
          <FormControl>
            <Input 
              placeholder="e.g., PC, EA, KG (2-3 chars)" 
              {...field}
              maxLength={3}
              onChange={(e) => {
                field.onChange(e);
                if (setTempProduct && tempProduct) {
                  setTempProduct({
                    ...tempProduct,
                    unit: e.target.value
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

export default UnitField;
