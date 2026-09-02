import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { IncidentEvidencePurpose } from 'src/common/enums/incident-evidence-purpose.enum';
import { UploadService } from 'src/modules/upload/upload.service';
import { IncidentEntity } from '../entity/incident.entity';
import { IncidentDecisionResponseEntity } from '../entity/incident-decision-response.entity';
import { IncidentEvidenceEntity } from '../entity/incident-evidence.entity';
import { vietnamNowMinus } from 'src/common/helpers/vietnam-time.helper';

export type IncidentEvidenceAudience = 'ADMIN' | 'TASKER' | 'CUSTOMER';

export const INCIDENT_EVIDENCE_VISIBILITY = {
  ADMIN_ONLY: 'ADMIN_ONLY',
  ADMIN_TASKER: 'ADMIN_TASKER',
  INCIDENT_PARTIES: 'INCIDENT_PARTIES',
} as const;

interface UploadDetachedEvidenceOptions {
  purpose?: IncidentEvidencePurpose;
  visibility?: string;
}

@Injectable()
export class IncidentEvidenceLifecycleService {
  private readonly logger = new Logger(IncidentEvidenceLifecycleService.name);

  constructor(
    @InjectRepository(IncidentEvidenceEntity)
    private readonly evidenceRepo: Repository<IncidentEvidenceEntity>,
    private readonly uploadService: UploadService,
  ) {}

  async uploadDetachedEvidence(
    userId: string,
    file: Express.Multer.File,
    options: UploadDetachedEvidenceOptions = {},
  ): Promise<{ id: string; url: string; fileType: string }> {
    // Ảnh sự cố luôn upload ở chế độ có ký: quyền xem phụ thuộc vai trò người dùng, nên
    // không được phép tồn tại một URL trần dùng mãi mãi cho bất kỳ ai có link.
    const uploaded = await this.uploadService.uploadImage(file, undefined, {
      authenticated: true,
    });
    try {
      const evidence = await this.evidenceRepo.save(
        this.evidenceRepo.create({
          incident: null,
          damageItem: null,
          fileUrl: uploaded.url,
          fileType: 'IMAGE',
          storagePublicId: uploaded.public_id,
          storageType: 'AUTHENTICATED',
          uploadedBy: { id: userId },
          purpose: options.purpose ?? null,
          visibility:
            options.visibility ?? INCIDENT_EVIDENCE_VISIBILITY.INCIDENT_PARTIES,
          isSoftDeleted: false,
          isActiveForResponse: true,
        }),
      );
      return {
        id: evidence.id,
        url: this.deliveryUrl(evidence),
        fileType: 'IMAGE',
      };
    } catch (e) {
      await this.cleanupUploadedFile(uploaded.public_id);
      throw e;
    }
  }

  /**
   * Điểm NGHẼN DUY NHẤT quyết định người xem thấy gì — và cũng là nơi ký URL.
   *
   * Gộp hai việc vào một chỗ là có chủ ý: chữ ký chỉ sinh ra cho đúng những tấm ảnh vừa qua
   * được bộ lọc, nên không có đường nào trả ra URL của ảnh ngoài tầm nhìn hay ảnh đã xoá mềm
   * mà lại quên mất bước kiểm quyền. Ảnh đã xoá mềm không bao giờ được ký ⟹ không tải được
   * nữa, trong khi file vẫn còn nguyên cho mục đích đối chứng về sau.
   */
  filterForAudience(
    evidences: IncidentEvidenceEntity[],
    audience: IncidentEvidenceAudience,
  ): IncidentEvidenceEntity[] {
    return evidences
      .filter((evidence) => this.isVisibleToAudience(evidence, audience))
      .map((evidence) => {
        evidence.fileUrl = this.deliveryUrl(evidence);
        return evidence;
      });
  }

  /** Ảnh cũ (`PUBLIC`) giữ nguyên URL đã lưu — ký chúng sẽ trỏ vào tài sản không tồn tại. */
  private deliveryUrl(evidence: IncidentEvidenceEntity): string {
    if (evidence.storageType !== 'AUTHENTICATED' || !evidence.storagePublicId) {
      return evidence.fileUrl;
    }
    return this.uploadService.signedUrl(evidence.storagePublicId);
  }

  isVisibleToAudience(
    evidence: IncidentEvidenceEntity,
    audience: IncidentEvidenceAudience,
  ): boolean {
    if (evidence.isSoftDeleted) return false;
    switch (audience) {
      case 'ADMIN':
        return true;
      case 'TASKER':
        return (
          evidence.visibility === INCIDENT_EVIDENCE_VISIBILITY.ADMIN_TASKER ||
          evidence.visibility === INCIDENT_EVIDENCE_VISIBILITY.INCIDENT_PARTIES
        );
      case 'CUSTOMER':
        return (
          evidence.visibility === INCIDENT_EVIDENCE_VISIBILITY.INCIDENT_PARTIES
        );
    }
  }

  /**
   * Dọn ảnh đã upload nhưng không bao giờ được gắn vào sự cố nào.
   *
   * `uploadDetachedEvidence` tạo bản ghi với `incident = null` ngay lúc chọn file, trước khi
   * người dùng bấm gửi. Ai upload xong rồi bỏ ngang form sẽ để lại cả dòng DB lẫn file trên
   * storage — không có gì dọn, nên rác tăng đều theo số người bỏ giữa chừng, kèm chi phí lưu
   * trữ. Đây là rò rỉ âm thầm: không lỗi, không cảnh báo, chỉ phình.
   *
   * Xoá file TRƯỚC rồi mới xoá bản ghi: nếu đảo thứ tự mà bước sau hỏng thì mất luôn
   * `storagePublicId` và file thành rác không ai truy ra được nữa.
   */
  async purgeAbandonedUploads(
    olderThanHours: number,
    limit = 100,
  ): Promise<number> {
    const cutoff = vietnamNowMinus(olderThanHours * 3_600_000);
    const orphans = await this.evidenceRepo
      .createQueryBuilder('e')
      .where('e.incident_id IS NULL')
      .andWhere('e.created_at < :cutoff', { cutoff })
      .orderBy('e.created_at', 'ASC')
      .take(limit)
      .getMany();

    let purged = 0;
    for (const evidence of orphans) {
      if (evidence.storagePublicId) {
        const removed = await this.uploadService.destroyQuietly(
          evidence.storagePublicId,
          { authenticated: evidence.storageType === 'AUTHENTICATED' },
        );
        // Storage lỗi tạm thời → để nguyên, vòng quét sau thử lại.
        if (!removed) continue;
      }
      await this.evidenceRepo.delete({ id: evidence.id });
      purged += 1;
    }
    return purged;
  }

  async softDeleteEvidence(
    manager: EntityManager,
    evidenceId: string,
    deletedByUserId: string,
  ): Promise<void> {
    await manager
      .getRepository(IncidentEvidenceEntity)
      .createQueryBuilder()
      .update()
      .set({
        isSoftDeleted: true,
        softDeletedAt: () => "(NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')",
        softDeletedBy: { id: deletedByUserId } as never,
        isActiveForResponse: false,
      })
      .where('id = :evidenceId', { evidenceId })
      .execute();
  }

  async replaceActiveResponseEvidenceLinks(
    manager: EntityManager,
    response: IncidentDecisionResponseEntity,
    evidences: IncidentEvidenceEntity[],
    incident: IncidentEntity,
  ): Promise<void> {
    const replacement = evidences[0];
    await manager
      .getRepository(IncidentEvidenceEntity)
      .createQueryBuilder()
      .update()
      .set({
        isActiveForResponse: false,
        replacedByEvidence: replacement
          ? ({ id: replacement.id } as never)
          : null,
      })
      .where('decision_response_id = :responseId', { responseId: response.id })
      .andWhere('is_active_for_response = true')
      .execute();

    if (!evidences.length) return;

    await manager
      .getRepository(IncidentEvidenceEntity)
      .createQueryBuilder()
      .update()
      .set({
        incident: { id: incident.id } as never,
        decisionResponse: { id: response.id } as never,
        decisionVersion: incident.decisionVersion,
        purpose: IncidentEvidencePurpose.DECISION_RESPONSE,
        visibility: INCIDENT_EVIDENCE_VISIBILITY.ADMIN_TASKER,
        isActiveForResponse: true,
        isSoftDeleted: false,
        replacedByEvidence: null,
      })
      .whereInIds(evidences.map((evidence) => evidence.id))
      .execute();
  }

  private async cleanupUploadedFile(publicId: string): Promise<void> {
    try {
      await this.uploadService.deleteImage(publicId, { authenticated: true });
    } catch (cleanupError) {
      this.logger.error(
        `Failed to cleanup uploaded evidence ${publicId}: ${String(
          cleanupError,
        )}`,
      );
    }
  }
}
