import { UserResponseDto } from './user-response.dto.js';

export class UserPageEntity {
    items: UserResponseDto[];
    page: number;
    pageSize: number;
    total: number;
}
