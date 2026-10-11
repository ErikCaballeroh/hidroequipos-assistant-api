import { QueryTemplateEntity } from './query-template.entity.js';

export class QueryTemplatePageEntity {
    items: QueryTemplateEntity[];
    page: number;
    pageSize: number;
    total: number;
}
