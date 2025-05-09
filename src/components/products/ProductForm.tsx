
import React from "react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

export const formSchema = z.object({
  prodcode: z.string().min(2, "Product code must be at least 2 characters"),
  description: z.string().min(3, "Description must be at least 3 characters"),
  unit: z.string().min(2, "Unit must be 2-3 characters").max(3, "Unit must be 2-3 characters"),
  unitprice: z.coerce.number().min(0.01, "Price must be greater than 0")
});

interface Product {
  prodcode: string;
  description: string | null;
  unit: string | null;
  currentPrice: number | null;
}

interface ProductFormProps {
  onSubmit: (values: z.infer<typeof formSchema>) => Promise<void>;
  isEdit?: boolean;
  product?: Product | null;
  onCancel: () => void;
  onManagePriceHistory?: () => void;
  tempProduct?: Product | null;
  setTempProduct?: (product: Product | null) => void;
}

const ProductForm = ({
  onSubmit,
  isEdit = false,
  product = null,
  onCancel,
  onManagePriceHistory,
  tempProduct,
  setTempProduct
}: ProductFormProps) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prodcode: product?.prodcode || "",
      description: product?.description || "",
      unit: product?.unit || "",
      unitprice: product?.currentPrice || 0
    }
  });

  const handleSubmit = form.handleSubmit(onSubmit);
  
  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4">
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
        <div className="flex justify-end space-x-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button type="submit">{isEdit ? "Save Changes" : "Add Product"}</Button>
        </div>
      </form>
    </Form>
  );
};

export default ProductForm;
