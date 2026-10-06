export class UserResponseDto {
    id: number;
    name: string;
    email: string;
    role: 'employee' | 'supervisor';
    active: boolean;
}
