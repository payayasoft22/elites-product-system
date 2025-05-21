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
    canAddPriceHistory,
    canEditPriceHistory,
    canDeletePriceHistory,
    isAdmin, // Assuming 'isAdmin' is used to determine if the user is an admin
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
    if (!canAddPriceHistory) {
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
    if (!canEditPriceHistory) {
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
    if (!canDeletePriceHistory) {
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
      <div className="space-y-4">
        {loading ? (
          <Loader2 className="animate-spin h-6 w-6" />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{productDetails?.description || "Product Not Found"}</CardTitle>
              <CardDescription>Product Code: {productDetails?.prodcode}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Effective Date</TableHead>
                    <TableHead>Price</TableHead>
                    {isAdmin && (
                      <TableHead className="text-center">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceHistory.map((item) => (
                    <TableRow key={item.effdate}>
                      <TableCell>{formatDate(item.effdate)}</TableCell>
                      <TableCell>{formatPrice(item.unitprice)}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-center">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedPrice(item);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => {
                              setSelectedPrice(item);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Add Button */}
              {isAdmin && (
                <Button variant="outline" onClick={() => setIsAddDialogOpen(true)} className="mt-4">
                  <Plus className="mr-2" /> Add Price
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Price Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Price</DialogTitle>
            <DialogDescription>Enter the price and effective date for this product</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-price">Price</Label>
              <Input
                id="new-price"
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <Label htmlFor="new-date">Effective Date</Label>
              <Input
                id="new-date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleAddPrice}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Price Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Price</DialogTitle>
            <DialogDescription>Modify the price for this product</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-price">New Price</Label>
              <Input
                id="edit-price"
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleEditPrice}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Price Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Price</DialogTitle>
            <DialogDescription>Are you sure you want to delete this price history record?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDeletePrice}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default PriceHistory;
