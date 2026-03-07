export interface StockItem {
    id: number;
    name: string;
    reference: string;
    quantity: number;
    minQuantity: number;
    unit: string;
    location?: string;
}
