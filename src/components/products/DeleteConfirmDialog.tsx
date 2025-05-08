
import React from "react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

interface DeleteConfirmDialogProps {
  itemType: "Product" | "Price";
  itemName: string;
  onDelete: () => void;
  onCancel: () => void;
}

const DeleteConfirmDialog = ({
  itemType,
  itemName,
  onDelete,
  onCancel
}: DeleteConfirmDialogProps) => {
  return (
    <>
      <p className="mb-4">
        Are you sure you want to delete {itemType.toLowerCase()} {itemName}? This action cannot be undone.
      </p>
      <DialogFooter className="gap-2 sm:gap-0">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
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
    </>
  );
};

export default DeleteConfirmDialog;
