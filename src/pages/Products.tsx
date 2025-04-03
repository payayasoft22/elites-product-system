
import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Package, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

const Products = () => {
  const { toast } = useToast();

  const handleAddProduct = () => {
    toast({
      title: "Feature in development",
      description: "The ability to add products is coming soon!",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Products</h2>
            <p className="text-muted-foreground">Manage your product catalog and pricing history.</p>
          </div>
          <Button onClick={handleAddProduct} className="gap-1">
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>

        <Card className="p-6">
          <div className="min-h-[300px] flex flex-col items-center justify-center text-center p-8">
            <div className="rounded-full bg-primary/10 p-3 mb-4">
              <Package className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No products yet</h3>
            <p className="text-muted-foreground max-w-sm mb-6">
              Get started by adding your first product to track its price history.
            </p>
            <Button onClick={handleAddProduct} className="gap-1">
              <Plus className="h-4 w-4" /> Add Your First Product
            </Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Products;
