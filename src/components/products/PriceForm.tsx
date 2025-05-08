
import React from "react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DialogFooter } from "@/components/ui/dialog";

export const priceHistorySchema = z.object({
  unitprice: z.coerce.number().min(0.01, "Price must be greater than 0"),
  effdate: z.string().min(1, "Effective date is required")
});

interface PriceFormProps {
  onSubmit: (values: z.infer<typeof priceHistorySchema>) => Promise<void>;
  isEdit?: boolean;
  initialPrice?: number;
  initialDate?: string;
  onCancel: () => void;
}

const PriceForm = ({
  onSubmit,
  isEdit = false,
  initialPrice = 0,
  initialDate = new Date().toISOString().split("T")[0],
  onCancel
}: PriceFormProps) => {
  const form = useForm<z.infer<typeof priceHistorySchema>>({
    resolver: zodResolver(priceHistorySchema),
    defaultValues: {
      unitprice: initialPrice,
      effdate: initialDate
    }
  });

  const handleSubmit = form.handleSubmit(onSubmit);
  
  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          control={form.control}
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
          control={form.control}
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
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button type="submit">{isEdit ? "Save Changes" : "Add Price"}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default PriceForm;
