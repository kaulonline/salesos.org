import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { TwoFactorService } from './two-factor.service';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { DisableTwoFactorDto } from './dto/disable-two-factor.dto';
import { AddTrustedDeviceDto } from './dto/add-trusted-device.dto';

@ApiTags('Two-Factor Authentication')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('auth/2fa')
export class TwoFactorController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get 2FA status for current user' })
  async getStatus(@Request() req) {
    return this.twoFactorService.getStatus(req.user.id);
  }

  @Post('setup')
  @ApiOperation({ summary: 'Initialize 2FA setup - returns QR code and secret' })
  async setup(@Request() req) {
    return this.twoFactorService.setup(req.user.id);
  }

  @Post('verify-setup')
  @ApiOperation({ summary: 'Verify 2FA setup with TOTP code' })
  async verifySetup(@Request() req, @Body() dto: VerifyCodeDto) {
    return this.twoFactorService.verifySetup(req.user.id, dto.code);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify TOTP code during login' })
  async verify(@Request() req, @Body() dto: VerifyCodeDto) {
    return this.twoFactorService.verify(req.user.id, dto.code);
  }

  @Post('disable')
  @ApiOperation({ summary: 'Disable 2FA for current user' })
  async disable(@Request() req, @Body() dto: DisableTwoFactorDto) {
    return this.twoFactorService.disable(req.user.id, dto.password);
  }

  @Get('backup-codes')
  @ApiOperation({ summary: 'Get backup codes status' })
  async getBackupCodes(@Request() req) {
    return this.twoFactorService.getBackupCodes(req.user.id);
  }

  @Post('regenerate-backup-codes')
  @ApiOperation({ summary: 'Regenerate backup codes' })
  async regenerateBackupCodes(@Request() req) {
    return this.twoFactorService.regenerateBackupCodes(req.user.id);
  }

  @Get('trusted-devices')
  @ApiOperation({ summary: 'Get list of trusted devices' })
  async getTrustedDevices(@Request() req) {
    return this.twoFactorService.getTrustedDevices(req.user.id);
  }

  @Post('trusted-devices')
  @ApiOperation({ summary: 'Add a trusted device' })
  async addTrustedDevice(@Request() req, @Body() dto: AddTrustedDeviceDto) {
    return this.twoFactorService.addTrustedDevice(req.user.id, dto);
  }

  @Delete('trusted-devices/:deviceId')
  @ApiOperation({ summary: 'Remove a trusted device' })
  async removeTrustedDevice(@Request() req, @Param('deviceId') deviceId: string) {
    return this.twoFactorService.removeTrustedDevice(req.user.id, deviceId);
  }

  @Delete('trusted-devices')
  @ApiOperation({ summary: 'Remove all trusted devices' })
  async removeAllTrustedDevices(@Request() req) {
    return this.twoFactorService.removeAllTrustedDevices(req.user.id);
  }
}
