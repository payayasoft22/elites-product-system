
import React from "react";

const ProductErrorState = () => {
  return (
    <div className="min-h-[300px] flex flex-col items-center justify-center text-center">
      <p className="text-destructive">Error loading products. Please try again.</p>
    </div>
  );
};

export default ProductErrorState;
