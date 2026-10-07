import { Body, Controller, Get, Post, Put, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NoGuestGuard } from '../common/guards/no-guest.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { SellerApplicationService } from './seller-application.service';
import { SellerApplicationDto, UploadDocumentDto } from './application.dto';
import { MAX_DOCUMENT_BYTES } from './document-processing';

@Controller('seller-application')
@UseGuards(JwtAuthGuard, NoGuestGuard)
export class SellerApplicationController {
  constructor(private readonly service: SellerApplicationService) {}

  @Get()
  mine(@CurrentUser() user: JwtUser) {
    return this.service.mine(user.sub);
  }

  @Post('document')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_DOCUMENT_BYTES, files: 1 } }))
  // multipart fields: file, kind (BR | NIC_FRONT | NIC_BACK | SELFIE), lat/lng (selfie)
  upload(@CurrentUser() user: JwtUser, @UploadedFile() file: any, @Body() meta: UploadDocumentDto) {
    return this.service.uploadDocument(user.sub, file, meta);
  }

  @Put()
  submit(@CurrentUser() user: JwtUser, @Body() dto: SellerApplicationDto) {
    return this.service.submit(user.sub, dto);
  }
}
