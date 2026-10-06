import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class UpdateUserDto {
    @IsOptional()
    @IsIn(['employee', 'supervisor'])
    role?: string;

    @IsOptional()
    @IsBoolean()
    active?: boolean;
}
