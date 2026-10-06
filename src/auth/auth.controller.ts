import { Body, Controller, Get, Post, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { LoginDto } from './dto/login.dto.js';
import { LoginResponseDto } from './dto/login-response.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { MeResponseDto } from './dto/me-response.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    @ApiOkResponse({ type: LoginResponseDto })
    login(@Body() dto: LoginDto) {
        return this.authService.login(dto.email, dto.password);
    }

    @Get('me')
    @ApiBearerAuth()
    @ApiOkResponse({ type: MeResponseDto })
    @UseGuards(JwtAuthGuard)
    me(@Req() req: any) {
        return this.authService.obtenerPerfil(req.user.userId);
    }

    @Post('change-password')
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
        return this.authService.cambiarPassword(req.user.userId, dto.currentPassword, dto.newPassword);
    }
}