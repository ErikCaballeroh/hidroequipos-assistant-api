import { ProductSourceEntity } from './product-source.entity.js';
import { KnowledgeSourceEntity } from './knowledge-source.entity.js';

export class SourcesEntity {
    products: ProductSourceEntity[];
    knowledge: KnowledgeSourceEntity[];
}
