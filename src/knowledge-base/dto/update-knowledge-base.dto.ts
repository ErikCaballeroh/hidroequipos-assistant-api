import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateKnowledgeBaseDto {
    @IsOptional()
    @IsString()
    @MinLength(1)
    title?: string;

    @IsOptional()
    @IsString()
    @MinLength(1)
    description?: string;
}
