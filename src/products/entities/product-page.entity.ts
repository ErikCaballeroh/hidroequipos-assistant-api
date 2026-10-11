import { ProductEntity } from './product.entity.js';

export class ProductPageEntity {
    items: ProductEntity[];
    page: number;
    pageSize: number;
    total: number;
}
