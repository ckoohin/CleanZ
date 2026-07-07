import { IncidentEvidencePurpose } from 'src/common/enums/incident-evidence-purpose.enum';
import { IncidentEvidenceEntity } from '../entity/incident-evidence.entity';
import {
  INCIDENT_EVIDENCE_VISIBILITY,
  IncidentEvidenceLifecycleService,
} from './incident-evidence-lifecycle.service';

describe('IncidentEvidenceLifecycleService', () => {
  it('cleans up Cloudinary file when DB save fails after upload success', async () => {
    const repo = {
      create: jest.fn((value) => value),
      save: jest.fn().mockRejectedValue(new Error('db down')),
    };
    const upload = {
      uploadImage: jest.fn().mockResolvedValue({
        url: 'https://cdn/evidence.jpg',
        public_id: 'CleanZ/uploads/evidence',
      }),
      deleteImage: jest.fn().mockResolvedValue({ message: 'deleted' }),
    };
    const service = new IncidentEvidenceLifecycleService(
      repo as never,
      upload as never,
    );

    await expect(
      service.uploadDetachedEvidence('user-1', {} as Express.Multer.File),
    ).rejects.toThrow('db down');

    expect(upload.deleteImage).toHaveBeenCalledWith('CleanZ/uploads/evidence');
  });

  it('does not create DB evidence when upload fails', async () => {
    const repo = {
      create: jest.fn(),
      save: jest.fn(),
    };
    const upload = {
      uploadImage: jest.fn().mockRejectedValue(new Error('cloudinary down')),
      deleteImage: jest.fn(),
    };
    const service = new IncidentEvidenceLifecycleService(
      repo as never,
      upload as never,
    );

    await expect(
      service.uploadDetachedEvidence('user-1', {} as Express.Multer.File),
    ).rejects.toThrow('cloudinary down');

    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
    expect(upload.deleteImage).not.toHaveBeenCalled();
  });

  it('applies visibility policy by audience and hides soft-deleted evidence', () => {
    const service = new IncidentEvidenceLifecycleService(
      {} as never,
      {} as never,
    );
    const report = evidence({
      id: 'report',
      visibility: INCIDENT_EVIDENCE_VISIBILITY.INCIDENT_PARTIES,
    });
    const response = evidence({
      id: 'response',
      visibility: INCIDENT_EVIDENCE_VISIBILITY.ADMIN_TASKER,
    });
    const adminOnly = evidence({
      id: 'admin',
      visibility: INCIDENT_EVIDENCE_VISIBILITY.ADMIN_ONLY,
    });
    const deleted = evidence({
      id: 'deleted',
      visibility: INCIDENT_EVIDENCE_VISIBILITY.INCIDENT_PARTIES,
      isSoftDeleted: true,
    });

    expect(
      service
        .filterForAudience([report, response, adminOnly, deleted], 'CUSTOMER')
        .map((item) => item.id),
    ).toEqual(['report']);
    expect(
      service
        .filterForAudience([report, response, adminOnly, deleted], 'TASKER')
        .map((item) => item.id),
    ).toEqual(['report', 'response']);
    expect(
      service
        .filterForAudience([report, response, adminOnly, deleted], 'ADMIN')
        .map((item) => item.id),
    ).toEqual(['report', 'response', 'admin']);
  });

  it('replaces response evidence without hard delete and links old row to replacement', async () => {
    const updates: Array<Record<string, unknown>> = [];
    const qb = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn((value) => {
        updates.push(value);
        return qb;
      }),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      whereInIds: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    };
    const manager = {
      getRepository: jest.fn(() => ({
        createQueryBuilder: jest.fn(() => qb),
      })),
    };
    const service = new IncidentEvidenceLifecycleService(
      {} as never,
      {} as never,
    );

    await service.replaceActiveResponseEvidenceLinks(
      manager as never,
      { id: 'response-1' } as never,
      [evidence({ id: 'new-evidence' })],
      { id: 'incident-1', decisionVersion: 3 } as never,
    );

    expect(updates[0]).toMatchObject({
      isActiveForResponse: false,
      replacedByEvidence: { id: 'new-evidence' },
    });
    expect(updates[1]).toMatchObject({
      decisionVersion: 3,
      purpose: IncidentEvidencePurpose.DECISION_RESPONSE,
      visibility: INCIDENT_EVIDENCE_VISIBILITY.ADMIN_TASKER,
      isActiveForResponse: true,
      isSoftDeleted: false,
      replacedByEvidence: null,
    });
  });
});

function evidence(
  patch: Partial<IncidentEvidenceEntity>,
): IncidentEvidenceEntity {
  return {
    isSoftDeleted: false,
    visibility: INCIDENT_EVIDENCE_VISIBILITY.INCIDENT_PARTIES,
    ...patch,
  } as IncidentEvidenceEntity;
}
