
import { usePermission } from "@/hooks/usePermission";

export const usePermissionCheck = () => {
  const { can, isAdmin, isLoading: permissionsLoading } = usePermission();
  
  // Permission based state
  const canAddProduct = isAdmin || can("add_product");
  const canEditProduct = isAdmin || can("edit_product");
  const canDeleteProduct = isAdmin || can("delete_product");
  const canAddPriceHistory = isAdmin || can("add_price_history");
  const canEditPriceHistory = isAdmin || can("edit_price_history");
  const canDeletePriceHistory = isAdmin || can("delete_price_history");

  return {
    canAddProduct,
    canEditProduct,
    canDeleteProduct,
    canAddPriceHistory,
    canEditPriceHistory,
    canDeletePriceHistory,
    isAdmin,
    permissionsLoading
  };
};
