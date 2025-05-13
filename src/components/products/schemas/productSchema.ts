
import * as z from "zod";

export const productFormSchema = z.object({
  prodcode: z.string().min(2, "Product code must be at least 2 characters"),
  description: z.string().min(3, "Description must be at least 3 characters"),
  unit: z.string().min(2, "Unit must be 2-3 characters").max(3, "Unit must be 2-3 characters"),
  unitprice: z.coerce.number().min(0.01, "Price must be greater than 0")
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
