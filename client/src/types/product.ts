export type Product = {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  quantityOnHand: number;
  costPrice: number | null;
  sellingPrice: number | null;
  lowStockThreshold: number | null;
  lastAdjustmentNote: string | null;
  effectiveThreshold: number; // product threshold, or the organization default when empty
  isLowStock: boolean;
  createdAt: string;
  updatedAt: string;
};