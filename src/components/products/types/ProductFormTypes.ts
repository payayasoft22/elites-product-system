
import { z } from "zod";
import { formSchema } from "../ProductForm";
import { Product } from "@/features/products/types";

export interface ProductFormProps {
  onSubmit: (values: z.infer<typeof formSchema>) => Promise<void>;
  isEdit?: boolean;
  product?: Product | null;
  onCancel: () => void;
  onManagePriceHistory?: () => void;
  tempProduct?: Product | null;
  setTempProduct?: (product: Product | null) => void;
}
