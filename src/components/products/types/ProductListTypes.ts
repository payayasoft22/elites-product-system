
import { Product } from "@/features/products/types";

export interface ProductListProps {
  products: Product[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  itemsPerPage: number;
  handleAddProduct: () => void;
  handleEditProduct: (product: Product) => void;
  handleDeleteProduct: (product: Product) => void;
  canAddProduct?: boolean;
  canEditProduct?: boolean;
  canDeleteProduct?: boolean;
}
