import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Calendar, DollarSign, Loader2, Plus } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermission } from "@/hooks/usePermission";

interface PriceHistoryItem {
  effdate: string;
  unitprice: number | null;
}

const PriceHistory = () => {
  const { prodcode } = useParams<{ prodcode: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    isAdmin,
    canAddPriceHistory,
    canEditPriceHistory,
    canDeletePriceHistory
  } = usePermission();
  const [loading, setLoading] = useState(true);
  const [productDetails, setProductDetails] = useState<{
    prodcode: string;
    description: string | null;
    unit: string | null;
  } | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryItem[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPrice, setSelectedPrice] = useState<PriceHistoryItem | null>(null);
  const [newPrice, setNewPrice] = useState<string>("");
  const [newDate, setNewDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  const showPermissionDenied = () => {
    toast({
      title: "Permission Denied",
      description: "You don't have permission to perform this action",
      variant: "destructive",
    });
  };

  useEffect(() => {
    const fetchProductAndPriceHistory = async () => {
      try {
        setLoading(true);
        if (!prodcode) {
          throw new Error("Product code is required");
        }

        // Fetch product details
        const { data: productData, error: productError } = await supabase
          .from("product")
          .select("*")
          .eq("prodcode", prodcode)
          .single();

        if (productError) throw productError;
        if (!productData) throw new Error("Product not found");

        setProductDetails(productData);

        // Fetch price history
        const { data: priceData, error: priceError } = await supabase
          .from("pricehist")
          .select("effdate, unitprice")
          .eq("prodcode", prodcode)
          .order("effdate", { ascending: false });

        if (priceError) throw priceError;
        setPriceHistory(priceData || []);
      } catch (error: any) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to load product information",
          variant: "destructive",
        });
        navigate("/products");
      } finally {
        setLoading(false);
      }
    };

    fetchProductAndPriceHistory();
  }, [prodcode, navigate, toast]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "MMM d, yyyy");
    } catch {
      return dateString;
    }
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return "N/A";
    return `$${price.toFixed(2)}`;
  };

  const handleAddPrice = async () => {
    if (!isAdmin) {
      showPermissionDenied();
      return;
    }
    try {
      if (!prodcode || !newPrice || !newDate) {
        toast({
          title: "Validation Error",
          description: "Please provide both price and effective date",
          variant: "destructive",
        });
        return;
      }

      const price = parseFloat(newPrice);
      if (isNaN(price) || price <= 0) {
        toast({
          title: "Invalid Price",
          description: "Please enter a valid positive number for the price",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("pricehist").insert({
        prodcode,
        effdate: newDate,
        unitprice: price,
      });

      if (error) throw error;

      // Refresh price history
      const { data: updatedData, error: fetchError } = await supabase
        .from("pricehist")
        .select("effdate, unitprice")
        .eq("prodcode", prodcode)
        .order("effdate", { ascending: false });

      if (fetchError) throw fetchError;
      setPriceHistory(updatedData || []);

      setIsAddDialogOpen(false);
      setNewPrice("");
      setNewDate(format(new Date(), "yyyy-MM-dd"));

      toast({
        title: "Success",
        description: "Price history record added successfully",
      });
    } catch (error: any) {
      console.error("Error adding price:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add price history record",
        variant: "destructive",
      });
    }
  };

  const handleEditPrice = async () => {
    if (!isAdmin) {
      showPermissionDenied();
      return;
    }
    try {
      if (!prodcode || !newPrice || !selectedPrice) {
        toast({
          title: "Validation Error",
          description: "Please provide a valid price",
          variant: "destructive",
        });
        return;
      }

      const price = parseFloat(newPrice);
      if (isNaN(price) || price <= 0) {
        toast({
          title: "Invalid Price",
          description: "Please enter a valid positive number for the price",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("pricehist")
        .update({ unitprice: price })
        .eq("prodcode", prodcode)
        .eq("effdate", selectedPrice.effdate);

      if (error) throw error;

      // Refresh price history
      const { data: updatedData, error: fetchError } = await supabase
        .from("pricehist")
        .select("effdate, unitprice")
        .eq("prodcode", prodcode)
        .order("effdate", { ascending: false });

      if (fetchError) throw fetchError;
      setPriceHistory(updatedData || []);

      setIsEditDialogOpen(false);
      setSelectedPrice(null);
      setNewPrice("");

      toast({
        title: "Success",
        description: "Price history record updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating price:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update price history record",
        variant: "destructive",
      });
    }
  };

  const handleDeletePrice = async () => {
    if (!isAdmin) {
      showPermissionDenied();
      return;
    }
    try {
      if (!prodcode || !selectedPrice) {
        return;
      }

      const { error } = await supabase
        .from("pricehist")
        .delete()
        .eq("prodcode", prodcode)
        .eq("effdate", selectedPrice.effdate);

      if (error) throw error;

      // Refresh price history
      const { data: updatedData, error: fetchError } = await supabase
        .from("pricehist")
        .select("effdate, unitprice")
        .eq("prodcode", prodcode)
        .order("effdate", { ascending: false });

      if (fetchError) throw fetchError;
      setPriceHistory(updatedData || []);

      setIsDeleteDialogOpen(false);
      setSelectedPrice(null);

      toast({
        title: "Success",
        description: "Price history record deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting price:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete price history record",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/products")} className="mr-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Price History</h2>
              <p className="text-muted-foreground">View historical pricing information for a product</p>
            </div>
          </div>
          <Button
            onClick={() => {
              if (!isAdmin) {
                showPermissionDenied();
                return;
              }
              setNewPrice("");
              setNewDate(format(new Date(), "yyyy-MM-dd"));
              setIsAddDialogOpen(true);
            }}
            disabled={!isAdmin}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Price History
          </Button>
        </div>

        {loading ? (
          <Card className="flex items-center justify-center p-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p>Loading price history...</p>
            </div>
          </Card>
        ) : !productDetails ? (
          <Card className="p-6 text-center">
            <p>Product not found. Please go back and select a valid product.</p>
            <Button onClick={() => navigate("/products")} className="mt-4">
              Return to Products
            </Button>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-0">
              <CardTitle>
                {productDetails.prodcode}
                {productDetails.description && ` - ${productDetails.description}`}
              </CardTitle>
              <CardDescription>Unit: {productDetails.unit || "N/A"}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {priceHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Calendar className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="text-lg font-semibold">No price history available</h3>
                  <p className="text-muted-foreground mt-1">This product doesn't have any recorded price changes yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Effective Date</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priceHistory.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{formatDate(item.effdate)}</TableCell>
                        <TableCell>{formatPrice(item.unitprice)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (!isAdmin) {
                                  showPermissionDenied();
                                  return;
                                }
                                setSelectedPrice(item);
                                setNewPrice(item.unitprice?.toString() || "");
                                setIsEditDialogOpen(true);
                              }}
                              disabled={!isAdmin}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (!isAdmin) {
                                  showPermissionDenied();
                                  return;
                                }
                                setSelectedPrice(item);
                                setIsDeleteDialogOpen(true);
                              }}
                              disabled={!isAdmin}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Price Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Price History</DialogTitle>
            <DialogDescription>Add a new price history record for this product.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">
                Price
              </Label>
              <div className="col-span-3 flex items-center">
                <DollarSign className="h-4 w-4 mr-1 text-muted-foreground" />
                <Input
                  id="price"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full"
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={!isAdmin}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Effective Date
              </Label>
              <Input
                id="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="col-span-3"
                type="date"
                disabled={!isAdmin}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              type="submit" 
              onClick={handleAddPrice}
              disabled={!isAdmin}
            >
              Add Price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Price Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Price</DialogTitle>
            <DialogDescription>Update the price for {formatDate(selectedPrice?.effdate || "")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-price" className="text-right">
                Price
              </Label>
              <div className="col-span-3 flex items-center">
                <DollarSign className="h-4 w-4 mr-1 text-muted-foreground" />
                <Input
                  id="edit-price"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full"
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={!isAdmin}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              type="submit" 
              onClick={handleEditPrice}
              disabled={!isAdmin}
            >
              Update Price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the price history record from {formatDate(selectedPrice?.effdate || "")}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              variant="destructive" 
              onClick={handleDeletePrice}
              disabled={!isAdmin}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default PriceHistory;
