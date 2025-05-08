
export interface Product {
  prodcode: string;
  description: string | null;
  unit: string | null;
  currentPrice: number | null;
}

export interface PriceHistory {
  id?: number;
  prodcode: string;
  unitprice: number;
  effdate: string;
}
