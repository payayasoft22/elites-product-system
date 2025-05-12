
import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Clock, Plus, Edit, Trash } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Product, PriceHistory } from "@/components/products/types";

interface PriceHistorySheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tempProduct: Product | null;
  priceHistory: PriceHistory[];
  onAddPrice: () => void;
  onEditPrice: (price: PriceHistory) => void;
  onDeletePrice: (price: PriceHistory) => void;
  canAddPriceHistory?: boolean;
  canEditPriceHistory?: boolean;
  canDeletePriceHistory?: boolean;
}

const PriceHistorySheet = ({
  isOpen,
  onOpenChange,
  tempProduct,
  priceHistory,
  onAddPrice,
  onEditPrice,
  onDeletePrice,
  canAddPriceHistory = true,
  canEditPriceHistory = true,
  canDeletePriceHistory = true
}: PriceHistorySheetProps) => {
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle>Price History</SheetTitle>
          <SheetDescription>
            {tempProduct ? `Price history for ${tempProduct.prodcode} - ${tempProduct.description || ''}` : 'Loading...'}
          </SheetDescription>
        </SheetHeader>

        <div className="py-4 space-y-4">
          {canAddPriceHistory && (
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                className="gap-1"
                onClick={onAddPrice}
              >
                <Plus className="h-4 w-4" /> Add Price
              </Button>
            </div>
          )}

          {priceHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-8">
              <div className="rounded-full bg-muted p-3 mb-4">
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No price history</h3>
              <p className="text-muted-foreground max-w-sm mb-6">
                {tempProduct?.prodcode ? `${tempProduct.prodcode} doesn't have any price history records yet.` : 'No product selected.'}
              </p>
              {tempProduct?.prodcode && canAddPriceHistory && (
                <Button size="sm" onClick={onAddPrice}>
                  <Plus className="h-4 w-4 mr-1" /> Add First Price
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Effective Date</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceHistory.map((price, index) => (
                    <TableRow key={`${price.prodcode}-${price.effdate}`}>
                      <TableCell>
                        {new Date(price.effdate).toLocaleDateString()}
                        {index === 0 && (
                          <span className="ml-2 inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                            Current
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{formatPrice(price.unitprice)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {canEditPriceHistory && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => onEditPrice(price)}
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                          )}
                          {canDeletePriceHistory && priceHistory.length > 1 && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => onDeletePrice(price)}
                            >
                              <Trash className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="mt-4">
          <SheetClose asChild>
            <Button variant="outline" className="w-full">Close</Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PriceHistorySheet;
