import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { BookingWorkPhotoPhase } from 'src/common/enums/booking-work-photo-phase.enum';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { BookingEntity } from '../entity/booking.entity';
import { BookingWorkPhotoEntity } from '../entity/booking-work-photo.entity';
import {
  WORK_PHOTOS_MAX_PER_PHASE,
  WorkPhotoItemDto,
} from '../dto/work-photo.dto';

export interface WorkPhotoResponse {
  id: string;
  url: string;
  uploadedAt: Date;
}

export interface BookingWorkPhotos {
  before: WorkPhotoResponse[];
  after: WorkPhotoResponse[];
}

const PHASE_LABEL: Record<BookingWorkPhotoPhase, string> = {
  [BookingWorkPhotoPhase.BEFORE]: 'đầu ca',
  [BookingWorkPhotoPhase.AFTER]: 'cuối ca',
};

export function emptyWorkPhotos(): BookingWorkPhotos {
  return { before: [], after: [] };
}

@Injectable()
export class BookingWorkPhotoService {
  async saveWorkPhotos(
    manager: EntityManager,
    input: {
      booking: BookingEntity;
      phase: BookingWorkPhotoPhase;
      userId: string;
      photos: WorkPhotoItemDto[];
    },
  ): Promise<number> {
    const { booking, phase, userId, photos } = input;
    if (photos.length === 0) {
      return this.countByPhase(manager, booking.id, phase);
    }

    const repo = manager.getRepository(BookingWorkPhotoEntity);
    const existing = await this.countByPhase(manager, booking.id, phase);

    if (existing + photos.length > WORK_PHOTOS_MAX_PER_PHASE) {
      throw new BadRequestException(
        `Tối đa ${WORK_PHOTOS_MAX_PER_PHASE} ảnh ${PHASE_LABEL[phase]} cho mỗi đơn ` +
          `(đã có ${existing} ảnh)`,
      );
    }

    await repo.save(
      photos.map((photo, index) =>
        repo.create({
          booking: { id: booking.id } as BookingEntity,
          phase,
          fileUrl: photo.url,
          storagePublicId: photo.publicId ?? null,
          uploadedBy: { id: userId } as UserEntity,
          sortOrder: existing + index,
        }),
      ),
    );

    return existing + photos.length;
  }

  countByPhase(
    manager: EntityManager,
    bookingId: string,
    phase: BookingWorkPhotoPhase,
  ): Promise<number> {
    return manager.getRepository(BookingWorkPhotoEntity).count({
      where: { booking: { id: bookingId }, phase },
    });
  }

  /** Ảnh của MỘT đơn, tách sẵn theo giai đoạn cho response detail. */
  async findByBooking(
    manager: EntityManager | DataSource,
    bookingId: string,
  ): Promise<BookingWorkPhotos> {
    const rows = await manager.getRepository(BookingWorkPhotoEntity).find({
      where: { booking: { id: bookingId } },
      order: { phase: 'ASC', sortOrder: 'ASC', createdAt: 'ASC' },
    });

    return this.groupByPhase(rows);
  }

  private groupByPhase(rows: BookingWorkPhotoEntity[]): BookingWorkPhotos {
    const grouped = emptyWorkPhotos();
    for (const row of rows) {
      const bucket =
        row.phase === BookingWorkPhotoPhase.BEFORE
          ? grouped.before
          : grouped.after;
      bucket.push({
        id: row.id,
        url: row.fileUrl,
        uploadedAt: row.createdAt,
      });
    }
    return grouped;
  }
}
