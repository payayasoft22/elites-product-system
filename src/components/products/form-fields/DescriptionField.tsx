
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "../schemas/productSchema";
import { Product } from "@/features/products/types";

interface DescriptionFieldProps {
  form: UseFormReturn<ProductFormValues>;
  tempProduct?: Product | null;
  setTempProduct?: (product: Product | null) => void;
}

const DescriptionField = ({ form, tempProduct, setTempProduct }: DescriptionFieldProps) => {
  return (
    <FormField
      control={form.control}
      name="description"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Description</FormLabel>
          <FormControl>
            <Input 
              placeholder="Enter product description" 
              {...field}
              onChange={(e) => {
                field.onChange(e);
                if (setTempProduct && tempProduct) {
                  setTempProduct({
                    ...tempProduct,
                    description: e.target.value
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

export default DescriptionField;
