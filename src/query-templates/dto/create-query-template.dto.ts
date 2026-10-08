import { IsBoolean, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateQueryTemplateDto {
    @IsString()
    @MinLength(1)
    title: string;

    @IsString()
    @MinLength(1)
    queryText: string;

    @IsOptional()
    @IsInt()
    displayOrder?: number;

    @IsOptional()
    @IsBoolean()
    active?: boolean;
}
