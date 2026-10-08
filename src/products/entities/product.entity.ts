export class ProductEntity {
    id: number;
    sku: string | null;
    name: string;
    description: string | null;
    category: string | null;
    price: number | null;
    stock: number;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}
