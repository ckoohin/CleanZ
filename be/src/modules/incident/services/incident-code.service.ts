import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { IncidentEntity } from '../entity/incident.entity';

@Injectable()
export class IncidentCodeService {
  constructor(
    @InjectRepository(IncidentEntity)
    private readonly incidentRepo: Repository<IncidentEntity>,
  ) {}

  async next(now: Date = new Date()): Promise<string> {
    const y = now.getFullYear();
    const m = `${now.getMonth() + 1}`.padStart(2, '0');
    const d = `${now.getDate()}`.padStart(2, '0');
    const prefix = `IC-${y}${m}${d}`;
    const countToday = await this.incidentRepo.count({
      where: { incidentCode: Like(`${prefix}-%`) },
    });
    const seq = `${countToday + 1}`.padStart(4, '0');
    return `${prefix}-${seq}`;
  }
}
