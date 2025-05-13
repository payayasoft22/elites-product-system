
import React from "react";
import { Loader2 } from "lucide-react";

const ProductLoadingState = () => {
  return (
    <div className="min-h-[300px] flex flex-col items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
      <p>Loading products...</p>
    </div>
  );
};

export default ProductLoadingState;
