import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsLatitude, IsLongitude, IsNumber, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NoGuestGuard } from '../common/guards/no-guest.guard';
import { GeoService } from './geo.service';

class SearchQuery {
  @IsString() @MaxLength(200) q: string;
}
class ReverseQuery {
  @Type(() => Number) @IsNumber() @IsLatitude() lat: number;
  @Type(() => Number) @IsNumber() @IsLongitude() lng: number;
}

// Signed-in users only (used by the seller application map).
@Controller('geo')
@UseGuards(JwtAuthGuard, NoGuestGuard)
export class GeoController {
  constructor(private readonly geo: GeoService) {}

  @Get('search')
  search(@Query() q: SearchQuery) {
    return this.geo.search(q.q);
  }

  @Get('reverse')
  reverse(@Query() q: ReverseQuery) {
    return this.geo.reverse(q.lat, q.lng);
  }
}
