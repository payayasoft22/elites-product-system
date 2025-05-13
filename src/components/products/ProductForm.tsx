
import React from "react";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productFormSchema, ProductFormValues } from "./schemas/productSchema";
import { Product } from "@/features/products/types";
import ProductCodeField from "./form-fields/ProductCodeField";
import DescriptionField from "./form-fields/DescriptionField";
import UnitField from "./form-fields/UnitField";
import PriceField from "./form-fields/PriceField";
import FormActions from "./form-fields/FormActions";
import { ProductFormProps } from "./types/ProductFormTypes";

// Re-export the schema for external usage
export const formSchema = productFormSchema;

const ProductForm = ({
  onSubmit,
  isEdit = false,
  product = null,
  onCancel,
  onManagePriceHistory,
  tempProduct,
  setTempProduct
}: ProductFormProps) => {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
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
        <ProductCodeField 
          form={form} 
          isEdit={isEdit} 
          tempProduct={tempProduct} 
          setTempProduct={setTempProduct} 
        />
        <DescriptionField 
          form={form} 
          tempProduct={tempProduct} 
          setTempProduct={setTempProduct} 
        />
        <UnitField 
          form={form} 
          tempProduct={tempProduct} 
          setTempProduct={setTempProduct} 
        />
        <PriceField 
          form={form} 
          isEdit={isEdit} 
          onManagePriceHistory={onManagePriceHistory} 
          tempProduct={tempProduct} 
          setTempProduct={setTempProduct} 
        />
        <FormActions isEdit={isEdit} onCancel={onCancel} />
      </form>
    </Form>
  );
};

export default ProductForm;
