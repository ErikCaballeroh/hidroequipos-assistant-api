import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ProductEntity } from './entities/product.entity.js';

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('supervisor')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    @Get()
    @ApiOkResponse({ type: ProductEntity, isArray: true })
    findAll() {
        return this.productsService.findAll();
    }

    @Post()
    @ApiOkResponse({ type: ProductEntity })
    create(@Body() dto: CreateProductDto) {
        return this.productsService.create(dto);
    }

    @Patch(':id')
    @ApiOkResponse({ type: ProductEntity })
    update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
        return this.productsService.update(+id, dto);
    }

    @Delete(':id')
    deactivate(@Param('id') id: string) {
        return this.productsService.deactivate(+id);
    }
}
