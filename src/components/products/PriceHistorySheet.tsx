
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Clock, Plus, Edit, Trash } from "lucide-react";

interface PriceHistory {
  id?: number;
  prodcode: string;
  unitprice: number;
  effdate: string;
}

interface Product {
  prodcode: string;
  description: string | null;
  unit: string | null;
  currentPrice: number | null;
}

interface PriceHistorySheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tempProduct: Product | null;
  priceHistory: PriceHistory[];
  onAddPrice: () => void;
  onEditPrice: (price: PriceHistory) => void;
  onDeletePrice: (price: PriceHistory) => void;
}

const PriceHistorySheet = ({
  isOpen,
  onOpenChange,
  tempProduct,
  priceHistory,
  onAddPrice,
  onEditPrice,
  onDeletePrice
}: PriceHistorySheetProps) => {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Price History for {tempProduct?.prodcode}</SheetTitle>
          <SheetDescription>
            Manage the price history for this product. The most recent price will be used as the current price.
          </SheetDescription>
        </SheetHeader>
        
        <div className="py-6">
          <div className="flex justify-end mb-4">
            <Button onClick={onAddPrice} className="gap-1">
              <Plus className="h-4 w-4" /> Add Price History
            </Button>
          </div>
          
          {priceHistory.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No price history found</p>
              <p className="text-sm text-muted-foreground">Add a new price entry to start tracking price changes.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {priceHistory.map((price, index) => (
                  <TableRow key={`${price.prodcode}-${price.effdate}`}>
                    <TableCell>{new Date(price.effdate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD'
                      }).format(price.unitprice)}
                      {index === 0 && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          Current
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex items-center gap-1"
                          onClick={() => onEditPrice(price)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex items-center gap-1 text-destructive hover:text-destructive"
                          onClick={() => onDeletePrice(price)}
                        >
                          <Trash className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        
        <SheetFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default PriceHistorySheet;
