import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: ('employee' | 'supervisor')[]) => SetMetadata('roles', roles);