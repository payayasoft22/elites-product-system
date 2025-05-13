
import { Product, PriceHistory } from "@/components/products/types";

// Re-export types for better organization
export type { Product, PriceHistory };

export interface ProductState {
  products: Product[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  searchQuery: string;
  isAddProductOpen: boolean;
  isEditProductOpen: boolean;
  isDeleteConfirmOpen: boolean;
  selectedProduct: Product | null;
  isPriceHistorySheetOpen: boolean;
  priceHistory: PriceHistory[];
  isAddPriceOpen: boolean;
  isEditPriceOpen: boolean;
  isDeletePriceOpen: boolean;
  selectedPrice: PriceHistory | null;
  tempProduct: Product | null;
}
