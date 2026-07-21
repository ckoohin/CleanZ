import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { IncidentEvidencePurpose } from 'src/common/enums/incident-evidence-purpose.enum';
import { UploadService } from 'src/modules/upload/upload.service';
import { IncidentEntity } from '../entity/incident.entity';
import { IncidentDecisionResponseEntity } from '../entity/incident-decision-response.entity';
import { IncidentEvidenceEntity } from '../entity/incident-evidence.entity';

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
    const uploaded = await this.uploadService.uploadImage(file);
    try {
      const evidence = await this.evidenceRepo.save(
        this.evidenceRepo.create({
          incident: null,
          damageItem: null,
          fileUrl: uploaded.url,
          fileType: 'IMAGE',
          storagePublicId: uploaded.public_id,
          uploadedBy: { id: userId },
          purpose: options.purpose ?? null,
          visibility:
            options.visibility ?? INCIDENT_EVIDENCE_VISIBILITY.INCIDENT_PARTIES,
          isSoftDeleted: false,
          isActiveForResponse: true,
        }),
      );
      return { id: evidence.id, url: evidence.fileUrl, fileType: 'IMAGE' };
    } catch (e) {
      await this.cleanupUploadedFile(uploaded.public_id);
      throw e;
    }
  }

  filterForAudience(
    evidences: IncidentEvidenceEntity[],
    audience: IncidentEvidenceAudience,
  ): IncidentEvidenceEntity[] {
    return evidences.filter((evidence) =>
      this.isVisibleToAudience(evidence, audience),
    );
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
      await this.uploadService.deleteImage(publicId);
    } catch (cleanupError) {
      this.logger.error(
        `Failed to cleanup uploaded evidence ${publicId}: ${String(
          cleanupError,
        )}`,
      );
    }
  }
}
