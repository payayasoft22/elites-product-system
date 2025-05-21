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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" onClick={() => navigate("/products")}>
              <ArrowLeft size={16} />
              Back to Products
            </Button>
            <CardTitle>{productDetails?.description || "Product not found"}</CardTitle>
          </div>
          <Button
            variant="primary"
            onClick={() => setIsAddDialogOpen(true)}
            disabled={!canAddPriceHistory}
          >
            <Plus size={16} />
            Add Price
          </Button>
        </div>
        {loading ? (
          <div className="flex justify-center">
            <Loader2 className="animate-spin" size={24} />
          </div>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Price History</CardTitle>
                <CardDescription>
                  <span className="flex items-center space-x-2">
                    <Calendar size={16} />
                    <span>{productDetails?.unit}</span>
                  </span>
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceHistory.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{formatDate(item.effdate)}</TableCell>
                      <TableCell>{formatPrice(item.unitprice)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              if (canEditPriceHistory) {
                                setSelectedPrice(item);
                                setNewPrice(item.unitprice?.toString() || "");
                                setIsEditDialogOpen(true);
                              } else {
                                showPermissionDenied();
                              }
                            }}
                            disabled={!canEditPriceHistory}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              if (canDeletePriceHistory) {
                                setSelectedPrice(item);
                                setIsDeleteDialogOpen(true);
                              } else {
                                showPermissionDenied();
                              }
                            }}
                            disabled={!canDeletePriceHistory}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Price Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Price History</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newDate">Effective Date</Label>
              <Input
                id="newDate"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="newPrice">Price</Label>
              <Input
                id="newPrice"
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="Enter new price"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddPrice}>
              Add Price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Price Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Price History</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="newDate">Effective Date</Label>
              <Input
                id="newDate"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="newPrice">Price</Label>
              <Input
                id="newPrice"
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="Enter new price"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleEditPrice}>
              Update Price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Price Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Price History</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Are you sure you want to delete this price history record? This action cannot be undone.
          </DialogDescription>
          <DialogFooter>
            <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handleDeletePrice}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default PriceHistory;
