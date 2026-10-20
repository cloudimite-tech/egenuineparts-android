import { Body, Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { AdminService } from './admin.service';

class ListQuery {
  @IsOptional() @IsIn(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'])
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
}
class ReportListQuery {
  @IsOptional() @IsIn(['OPEN', 'RESOLVED', 'DISMISSED']) status?: 'OPEN' | 'RESOLVED' | 'DISMISSED';
}
class ResolveDto {
  @IsIn(['dismiss', 'remove_content', 'suspend_store', 'ban_user']) action: 'dismiss' | 'remove_content' | 'suspend_store' | 'ban_user';
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}
class UserQuery {
  @IsOptional() @IsString() @MaxLength(100) q?: string;
}
class BanDto {
  @IsString() @MaxLength(500) reason: string;
}
class ReviewDto {
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  stats() {
    return this.admin.stats();
  }

  @Get('sellers')
  @UseGuards(JwtAuthGuard, AdminGuard)
  list(@Query() q: ListQuery) {
    return this.admin.listSellers(q.status);
  }

  @Get('sellers/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  get(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.admin.getSeller(id, user.sub);
  }

  @Post('sellers/:id/approve')
  @UseGuards(JwtAuthGuard, AdminGuard)
  approve(@Param('id') id: string, @CurrentUser() user: JwtUser, @Body() dto: ReviewDto) {
    return this.admin.review(id, user.sub, 'approve', dto.note);
  }

  @Post('sellers/:id/reject')
  @UseGuards(JwtAuthGuard, AdminGuard)
  reject(@Param('id') id: string, @CurrentUser() user: JwtUser, @Body() dto: ReviewDto) {
    return this.admin.review(id, user.sub, 'reject', dto.note);
  }

  @Get('reports')
  @UseGuards(JwtAuthGuard, AdminGuard)
  reports(@Query() q: ReportListQuery) {
    return this.admin.listReports(q.status ?? 'OPEN');
  }

  @Post('reports/:id/resolve')
  @UseGuards(JwtAuthGuard, AdminGuard)
  resolve(@Param('id') id: string, @CurrentUser() user: JwtUser, @Body() dto: ResolveDto) {
    return this.admin.resolveReport(id, user.sub, dto.action, dto.note);
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, AdminGuard)
  users(@Query() q: UserQuery) {
    return this.admin.listUsers(q.q);
  }

  @Post('users/:id/ban')
  @UseGuards(JwtAuthGuard, AdminGuard)
  ban(@Param('id') id: string, @CurrentUser() user: JwtUser, @Body() dto: BanDto) {
    return this.admin.banUser(id, user.sub, dto.reason);
  }

  @Post('users/:id/delete')
  @UseGuards(JwtAuthGuard, AdminGuard)
  remove(@Param('id') id: string, @CurrentUser() user: JwtUser, @Body() dto: BanDto) {
    return this.admin.deleteUser(id, user.sub, dto.reason);
  }

  @Post('users/:id/unban')
  @UseGuards(JwtAuthGuard, AdminGuard)
  unban(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.admin.unbanUser(id, user.sub);
  }

  @Get('audit')
  @UseGuards(JwtAuthGuard, AdminGuard)
  auditLog() {
    return this.admin.auditLog();
  }

  // Opened from the admin panel via a short-lived signed link (see getSeller).
  @Get('documents/:id')
  async document(@Param('id') id: string, @Query('t') t: string, @Res() res: any) {
    const doc = await this.admin.document(id, t);
    res.set({
      'Content-Type': doc.mimeType,
      'Content-Length': String(doc.size),
      'Content-Disposition': `inline; filename="${doc.fileName}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    });
    res.end(doc.data);
  }
}
