
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Package, Plus, Loader2, Search, Edit, Trash, History, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";

interface Product {
  prodcode: string;
  description: string | null;
  unit: string | null;
  currentPrice: number | null;
}

interface PriceHistory {
  id?: number;
  prodcode: string;
  unitprice: number;
  effdate: string;
}

const formSchema = z.object({
  prodcode: z.string().min(2, "Product code must be at least 2 characters"),
  description: z.string().min(3, "Description must be at least 3 characters"),
  unit: z.string().min(1, "Unit is required"),
  unitprice: z.coerce.number().min(0.01, "Price must be greater than 0")
});

const priceHistorySchema = z.object({
  unitprice: z.coerce.number().min(0.01, "Price must be greater than 0"),
  effdate: z.string().min(1, "Effective date is required")
});

const Products = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isAddProductOpen, setIsAddProductOpen] = useState<boolean>(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState<boolean>(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isPriceHistorySheetOpen, setIsPriceHistorySheetOpen] = useState<boolean>(false);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [isAddPriceOpen, setIsAddPriceOpen] = useState<boolean>(false);
  const [isEditPriceOpen, setIsEditPriceOpen] = useState<boolean>(false);
  const [isDeletePriceOpen, setIsDeletePriceOpen] = useState<boolean>(false);
  const [selectedPrice, setSelectedPrice] = useState<PriceHistory | null>(null);
  const [tempProduct, setTempProduct] = useState<Product | null>(null);
  const itemsPerPage = 10;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prodcode: "",
      description: "",
      unit: "",
      unitprice: 0
    }
  });

  const editForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prodcode: "",
      description: "",
      unit: "",
      unitprice: 0
    }
  });

  const priceForm = useForm<z.infer<typeof priceHistorySchema>>({
    resolver: zodResolver(priceHistorySchema),
    defaultValues: {
      unitprice: 0,
      effdate: new Date().toISOString().split("T")[0]
    }
  });

  const editPriceForm = useForm<z.infer<typeof priceHistorySchema>>({
    resolver: zodResolver(priceHistorySchema),
    defaultValues: {
      unitprice: 0,
      effdate: new Date().toISOString().split("T")[0]
    }
  });

  const handleAddProduct = () => {
    const tempProd: Product = {
      prodcode: "",
      description: "",
      unit: "",
      currentPrice: 0
    };
    setTempProduct(tempProd);
    
    setIsAddProductOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    editForm.reset({
      prodcode: product.prodcode,
      description: product.description || "",
      unit: product.unit || "",
      unitprice: product.currentPrice || 0
    });
    setIsEditProductOpen(true);
  };

  const handleDeleteProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteConfirmOpen(true);
  };

  const handleManagePriceHistory = () => {
    if (!tempProduct) return;
    
    if (tempProduct.prodcode) {
      fetchPriceHistory(tempProduct.prodcode);
    }
    
    setIsPriceHistorySheetOpen(true);
  };

  const handleAddPrice = () => {
    setIsAddPriceOpen(true);
  };

  const handleEditPrice = (price: PriceHistory) => {
    setSelectedPrice(price);
    editPriceForm.reset({
      unitprice: price.unitprice,
      effdate: price.effdate
    });
    setIsEditPriceOpen(true);
  };

  const handleDeletePrice = (price: PriceHistory) => {
    setSelectedPrice(price);
    setIsDeletePriceOpen(true);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const { error: productError } = await supabase
        .from('product')
        .insert({
          prodcode: values.prodcode,
          description: values.description,
          unit: values.unit
        });

      if (productError) throw productError;

      const { error: priceError } = await supabase
        .from('pricehist')
        .insert({
          prodcode: values.prodcode,
          unitprice: values.unitprice,
          effdate: new Date().toISOString().split('T')[0]
        });

      if (priceError) throw priceError;

      toast({
        title: "Product added successfully",
        description: `${values.prodcode} has been added to your products.`
      });

      setIsAddProductOpen(false);
      form.reset();
      setTempProduct(null);
      setIsPriceHistorySheetOpen(false);
      setPriceHistory([]);

      fetchProducts();
    } catch (err: any) {
      console.error('Error adding product:', err);
      toast({
        title: "Error adding product",
        description: err.message || "Failed to add product. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onEdit = async (values: z.infer<typeof formSchema>) => {
    if (!selectedProduct) return;
    
    try {
      const { error: productError } = await supabase
        .from('product')
        .update({
          description: values.description,
          unit: values.unit
        })
        .eq('prodcode', selectedProduct.prodcode);

      if (productError) throw productError;

      if (values.unitprice !== selectedProduct.currentPrice) {
        const { error: priceError } = await supabase
          .from('pricehist')
          .insert({
            prodcode: selectedProduct.prodcode,
            unitprice: values.unitprice,
            effdate: new Date().toISOString().split('T')[0]
          });

        if (priceError) throw priceError;
      }

      toast({
        title: "Product updated successfully",
        description: `${selectedProduct.prodcode} has been updated.`
      });

      setIsEditProductOpen(false);
      editForm.reset();
      setSelectedProduct(null);

      fetchProducts();
    } catch (err: any) {
      console.error('Error updating product:', err);
      toast({
        title: "Error updating product",
        description: err.message || "Failed to update product. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onDelete = async () => {
    if (!selectedProduct) return;
    
    try {
      const { error: priceHistError } = await supabase
        .from('pricehist')
        .delete()
        .eq('prodcode', selectedProduct.prodcode);

      if (priceHistError) throw priceHistError;

      const { error: productError } = await supabase
        .from('product')
        .delete()
        .eq('prodcode', selectedProduct.prodcode);

      if (productError) throw productError;

      toast({
        title: "Product deleted successfully",
        description: `${selectedProduct.prodcode} has been removed from your products.`
      });

      setIsDeleteConfirmOpen(false);
      setSelectedProduct(null);

      fetchProducts();
    } catch (err: any) {
      console.error('Error deleting product:', err);
      toast({
        title: "Error deleting product",
        description: err.message || "Failed to delete product. Please try again.",
        variant: "destructive",
      });
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data: productsData, error: productsError } = await supabase
        .from('product')
        .select('*')
        .order('prodcode', { ascending: true }); // Ensure alphabetical order by product code

      if (productsError) throw productsError;

      if (productsData) {
        const productsWithPrices = await Promise.all(
          productsData.map(async (product) => {
            const { data: priceData, error: priceError } = await supabase
              .from('pricehist')
              .select('unitprice, effdate')
              .eq('prodcode', product.prodcode)
              .order('effdate', { ascending: false })
              .limit(1);

            if (priceError) {
              console.error(`Error fetching price for ${product.prodcode}:`, priceError);
              return {
                ...product,
                currentPrice: null
              };
            }

            return {
              ...product,
              currentPrice: priceData && priceData.length > 0 ? priceData[0].unitprice : null
            };
          })
        );

        setProducts(productsWithPrices);
      }
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError(err.message);
      toast({
        title: "Error",
        description: "Failed to load products. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPriceHistory = async (prodcode: string) => {
    try {
      const { data, error } = await supabase
        .from('pricehist')
        .select('*')
        .eq('prodcode', prodcode)
        .order('effdate', { ascending: false });

      if (error) throw error;
      
      setPriceHistory(data || []);
    } catch (err: any) {
      console.error('Error fetching price history:', err);
      toast({
        title: "Error",
        description: "Failed to load price history. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onSubmitPrice = async (values: z.infer<typeof priceHistorySchema>) => {
    if (!tempProduct) return;
    
    try {
      const { error } = await supabase
        .from('pricehist')
        .insert({
          prodcode: tempProduct.prodcode,
          unitprice: values.unitprice,
          effdate: values.effdate
        });

      if (error) throw error;

      toast({
        title: "Price history added",
        description: "New price has been added successfully."
      });
      
      fetchPriceHistory(tempProduct.prodcode);
      
      form.setValue('unitprice', values.unitprice);
      
      setTempProduct({
        ...tempProduct,
        currentPrice: values.unitprice
      });
      
      setIsAddPriceOpen(false);
      priceForm.reset();
    } catch (err: any) {
      console.error('Error adding price history:', err);
      toast({
        title: "Error adding price",
        description: err.message || "Failed to add price. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onEditPrice = async (values: z.infer<typeof priceHistorySchema>) => {
    if (!selectedPrice || !tempProduct) return;
    
    try {
      const { error } = await supabase
        .from('pricehist')
        .update({
          unitprice: values.unitprice,
          effdate: values.effdate
        })
        .eq('prodcode', selectedPrice.prodcode)
        .eq('effdate', selectedPrice.effdate);

      if (error) throw error;

      toast({
        title: "Price history updated",
        description: "Price has been updated successfully."
      });
      
      fetchPriceHistory(tempProduct.prodcode);
      
      if (priceHistory.length > 0 && priceHistory[0].effdate === selectedPrice.effdate) {
        form.setValue('unitprice', values.unitprice);
        
        setTempProduct({
          ...tempProduct,
          currentPrice: values.unitprice
        });
      }
      
      setIsEditPriceOpen(false);
      editPriceForm.reset();
      setSelectedPrice(null);
    } catch (err: any) {
      console.error('Error updating price history:', err);
      toast({
        title: "Error updating price",
        description: err.message || "Failed to update price. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onDeletePrice = async () => {
    if (!selectedPrice || !tempProduct) return;
    
    try {
      const { error } = await supabase
        .from('pricehist')
        .delete()
        .eq('prodcode', selectedPrice.prodcode)
        .eq('effdate', selectedPrice.effdate);

      if (error) throw error;

      toast({
        title: "Price history deleted",
        description: "Price has been deleted successfully."
      });
      
      fetchPriceHistory(tempProduct.prodcode);
      
      if (priceHistory.length > 0 && priceHistory[0].effdate === selectedPrice.effdate) {
        const newCurrentPrice = priceHistory.length > 1 ? priceHistory[1].unitprice : 0;
        form.setValue('unitprice', newCurrentPrice);
        
        setTempProduct({
          ...tempProduct,
          currentPrice: newCurrentPrice
        });
      }
      
      setIsDeletePriceOpen(false);
      setSelectedPrice(null);
    } catch (err: any) {
      console.error('Error deleting price history:', err);
      toast({
        title: "Error deleting price",
        description: err.message || "Failed to delete price. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [toast]);

  const filteredProducts = searchQuery.trim() === "" 
    ? products 
    : products.filter(product => 
        product.prodcode.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (product.description?.toLowerCase() || "").includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => a.prodcode.localeCompare(b.prodcode)); // Sort filtered results alphabetically

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  const formatPrice = (price: number | null): string => {
    if (price === null) return "N/A";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  useEffect(() => {
    if (tempProduct && tempProduct.prodcode) {
      form.setValue('prodcode', tempProduct.prodcode);
      if (tempProduct.description) form.setValue('description', tempProduct.description);
      if (tempProduct.unit) form.setValue('unit', tempProduct.unit);
      if (tempProduct.currentPrice) form.setValue('unitprice', tempProduct.currentPrice);
    }
  }, [tempProduct, form]);

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
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search products by code or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="min-h-[300px] flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p>Loading products...</p>
            </div>
          ) : error ? (
            <div className="min-h-[300px] flex flex-col items-center justify-center text-center">
              <p className="text-destructive">Error loading products. Please try again.</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="min-h-[300px] flex flex-col items-center justify-center text-center p-8">
              {searchQuery ? (
                <>
                  <div className="rounded-full bg-gray-100 p-3 mb-4">
                    <Search className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No matching products found</h3>
                  <p className="text-muted-foreground max-w-sm">
                    Try adjusting your search terms or clear the search to see all products.
                  </p>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Code</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Current Price</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedProducts.map((product) => (
                      <TableRow key={product.prodcode}>
                        <TableCell className="font-medium">{product.prodcode}</TableCell>
                        <TableCell>{product.description || "—"}</TableCell>
                        <TableCell>{product.unit || "—"}</TableCell>
                        <TableCell>{formatPrice(product.currentPrice)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex items-center gap-1"
                              onClick={() => navigate(`/products/${product.prodcode}/price-history`)}
                            >
                              <History className="h-3.5 w-3.5" />
                              <span>Price History</span>
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex items-center gap-1"
                              onClick={() => handleEditProduct(product)}
                            >
                              <Edit className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex items-center gap-1 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteProduct(product)}
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
              </div>
              
              {totalPages > 1 && (
                <Pagination className="mt-4">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: totalPages }).map((_, index) => (
                      <PaginationItem key={index}>
                        <PaginationLink
                          isActive={currentPage === index + 1}
                          onClick={() => setCurrentPage(index + 1)}
                        >
                          {index + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          )}
        </Card>
      </div>

      <Dialog open={isAddProductOpen} onOpenChange={(open) => {
        setIsAddProductOpen(open);
        if (!open) {
          setTempProduct(null);
          setIsPriceHistorySheetOpen(false);
          setPriceHistory([]);
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="prodcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Code</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter product code" 
                        {...field} 
                        onChange={(e) => {
                          field.onChange(e);
                          setTempProduct({
                            ...tempProduct!,
                            prodcode: e.target.value
                          });
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter product description" 
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setTempProduct({
                            ...tempProduct!,
                            description: e.target.value
                          });
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., kg, piece, box" 
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setTempProduct({
                            ...tempProduct!,
                            unit: e.target.value
                          });
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unitprice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Price</FormLabel>
                    <div className="space-y-2">
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0.01" 
                          step="0.01" 
                          placeholder="0.00" 
                          {...field} 
                          onChange={(e) => {
                            field.onChange(e);
                            const value = parseFloat(e.target.value);
                            setTempProduct({
                              ...tempProduct!,
                              currentPrice: isNaN(value) ? 0 : value
                            });
                          }}
                        />
                      </FormControl>
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full flex items-center justify-center gap-2"
                        onClick={handleManagePriceHistory}
                        disabled={!tempProduct?.prodcode}
                      >
                        <Clock className="h-4 w-4" />
                        Manage Price History
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddProductOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Add Product</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditProductOpen} onOpenChange={setIsEditProductOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="prodcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter product code" {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter product description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., kg, piece, box" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="unitprice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0.01" 
                        step="0.01" 
                        placeholder="0.00" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditProductOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedProduct?.prodcode}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              onClick={onDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={isPriceHistorySheetOpen} onOpenChange={setIsPriceHistorySheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Price History for {tempProduct?.prodcode}</SheetTitle>
            <SheetDescription>
              Manage the price history for this product. The most recent price will be used as the current price.
            </SheetDescription>
          </SheetHeader>
          
          <div className="py-6">
            <div className="flex justify-end mb-4">
              <Button onClick={handleAddPrice} className="gap-1">
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
                            onClick={() => handleEditPrice(price)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex items-center gap-1 text-destructive hover:text-destructive"
                            onClick={() => handleDeletePrice(price)}
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
              onClick={() => setIsPriceHistorySheetOpen(false)}
            >
              Done
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={isAddPriceOpen} onOpenChange={setIsAddPriceOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Price History</DialogTitle>
            <DialogDescription>
              Add a new price entry for {tempProduct?.prodcode}.
            </DialogDescription>
          </DialogHeader>
          <Form {...priceForm}>
            <form onSubmit={priceForm.handleSubmit(onSubmitPrice)} className="space-y-4">
              <FormField
                control={priceForm.control}
                name="unitprice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0.01" 
                        step="0.01" 
                        placeholder="0.00" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={priceForm.control}
                name="effdate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Effective Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddPriceOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Add Price</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditPriceOpen} onOpenChange={setIsEditPriceOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Price History</DialogTitle>
            <DialogDescription>
              Edit price entry for {tempProduct?.prodcode}.
            </DialogDescription>
          </DialogHeader>
          <Form {...editPriceForm}>
            <form onSubmit={editPriceForm.handleSubmit(onEditPrice)} className="space-y-4">
              <FormField
                control={editPriceForm.control}
                name="unitprice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0.01" 
                        step="0.01" 
                        placeholder="0.00" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editPriceForm.control}
                name="effdate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Effective Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditPriceOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeletePriceOpen} onOpenChange={setIsDeletePriceOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Price History</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this price entry? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeletePriceOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              onClick={onDeletePrice}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Products;
