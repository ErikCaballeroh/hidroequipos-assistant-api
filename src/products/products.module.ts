import { Module } from '@nestjs/common';
import { EmbeddingsModule } from '../embeddings/embeddings.module.js';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';

@Module({
    imports: [EmbeddingsModule],
    controllers: [ProductsController],
    providers: [ProductsService],
})
export class ProductsModule { }
