import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingEntity } from '../booking/entity/booking.entity';
import { GoongMapModule } from '../goong/goong-map.module';
import { TrackingGateway } from './tracking.gateway';
import { TrackingService } from './tracking.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({}),
    TypeOrmModule.forFeature([BookingEntity]),
    GoongMapModule,
  ],
  providers: [TrackingGateway, TrackingService],
  exports: [TrackingGateway, TrackingService],
})
export class TrackingModule {}
