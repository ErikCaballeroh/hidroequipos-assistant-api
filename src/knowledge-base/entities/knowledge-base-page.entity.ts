import { KnowledgeBaseEntity } from './knowledge-base.entity.js';

export class KnowledgeBasePageEntity {
    items: KnowledgeBaseEntity[];
    page: number;
    pageSize: number;
    total: number;
}
