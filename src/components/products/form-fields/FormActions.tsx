
import React from "react";
import { Button } from "@/components/ui/button";

interface FormActionsProps {
  isEdit: boolean;
  onCancel: () => void;
}

const FormActions = ({ isEdit, onCancel }: FormActionsProps) => {
  return (
    <div className="flex justify-end space-x-2">
      <Button 
        type="button" 
        variant="outline" 
        onClick={onCancel}
      >
        Cancel
      </Button>
      <Button type="submit">{isEdit ? "Save Changes" : "Add Product"}</Button>
    </div>
  );
};

export default FormActions;
