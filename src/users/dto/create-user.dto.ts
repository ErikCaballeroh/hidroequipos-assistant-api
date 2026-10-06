import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
    @IsString()
    name: string;

    @IsEmail()
    email: string;

    @IsString()
    @MinLength(8)
    password: string;

    @IsIn(['employee', 'supervisor'])
    role: 'employee' | 'supervisor';
}
