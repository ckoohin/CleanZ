import { Module } from '@nestjs/common';
import { GoongMapService } from './goong-map.service';

@Module({
  providers: [GoongMapService],
  exports: [GoongMapService],
})
export class GoongMapModule {}
