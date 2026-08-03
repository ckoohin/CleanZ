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

    expect(upload.deleteImage).toHaveBeenCalledWith('CleanZ/uploads/evidence', {
      authenticated: true,
    });
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

  /**
   * `visibility` trước đây chỉ lọc ở tầng JSON, còn file thì nằm sau một URL công khai vĩnh
   * viễn — ai có link đều xem được ảnh trong nhà khách hoặc ảnh chuyển khoản. Nay URL phải
   * do server ký, và chữ ký chỉ sinh cho ảnh vừa qua được bộ lọc.
   */
  describe('ký URL giao hàng', () => {
    const withSigner = () => {
      const upload = {
        signedUrl: jest.fn((id: string) => `https://cdn/signed/${id}?sig=abc`),
      };
      return {
        upload,
        service: new IncidentEvidenceLifecycleService(
          {} as never,
          upload as never,
        ),
      };
    };

    it('ảnh có ký được thay URL mới mỗi lần trả về', () => {
      const { service, upload } = withSigner();
      const item = evidence({
        id: 'e1',
        storageType: 'AUTHENTICATED',
        storagePublicId: 'CleanZ/uploads/e1',
        fileUrl: 'https://cdn/authenticated/e1.jpg',
      });

      const [out] = service.filterForAudience([item], 'ADMIN');

      expect(out.fileUrl).toBe('https://cdn/signed/CleanZ/uploads/e1?sig=abc');
      expect(upload.signedUrl).toHaveBeenCalledWith('CleanZ/uploads/e1');
    });

    it('ảnh cũ (PUBLIC) giữ nguyên URL — ký vào sẽ trỏ tài sản không tồn tại', () => {
      const { service, upload } = withSigner();
      const legacy = evidence({
        id: 'old',
        storageType: 'PUBLIC',
        storagePublicId: 'CleanZ/uploads/old',
        fileUrl: 'https://cdn/upload/old.jpg',
      });

      const [out] = service.filterForAudience([legacy], 'ADMIN');

      expect(out.fileUrl).toBe('https://cdn/upload/old.jpg');
      expect(upload.signedUrl).not.toHaveBeenCalled();
    });

    it('ảnh ngoài tầm nhìn và ảnh đã xoá mềm KHÔNG bao giờ được ký', () => {
      const { service, upload } = withSigner();
      const adminOnly = evidence({
        id: 'proof',
        visibility: INCIDENT_EVIDENCE_VISIBILITY.ADMIN_ONLY,
        storageType: 'AUTHENTICATED',
        storagePublicId: 'CleanZ/uploads/proof',
      });
      const deleted = evidence({
        id: 'deleted',
        isSoftDeleted: true,
        storageType: 'AUTHENTICATED',
        storagePublicId: 'CleanZ/uploads/deleted',
      });

      expect(
        service.filterForAudience([adminOnly, deleted], 'CUSTOMER'),
      ).toHaveLength(0);
      expect(upload.signedUrl).not.toHaveBeenCalled();
    });
  });

  /**
   * Ảnh upload rồi bỏ ngang form không có gì dọn: rác tăng đều theo số người bỏ giữa chừng,
   * âm thầm — không lỗi, không cảnh báo, chỉ phình cùng chi phí lưu trữ.
   */
  describe('purgeAbandonedUploads', () => {
    const makeRepo = (rows: Partial<IncidentEvidenceEntity>[]) => {
      const deleted: string[] = [];
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(rows),
      };
      const repo = {
        createQueryBuilder: jest.fn(() => qb),
        delete: jest.fn((where: { id: string }) => {
          deleted.push(where.id);
          return Promise.resolve({});
        }),
      };
      return { repo, deleted };
    };

    it('xoá file rồi mới xoá bản ghi, đúng chế độ lưu của từng ảnh', async () => {
      const { repo, deleted } = makeRepo([
        evidence({
          id: 'new',
          storageType: 'AUTHENTICATED',
          storagePublicId: 'CleanZ/uploads/new',
        }),
        evidence({
          id: 'legacy',
          storageType: 'PUBLIC',
          storagePublicId: 'CleanZ/uploads/legacy',
        }),
      ]);
      const upload = { destroyQuietly: jest.fn().mockResolvedValue(true) };
      const service = new IncidentEvidenceLifecycleService(
        repo as never,
        upload as never,
      );

      expect(await service.purgeAbandonedUploads(24)).toBe(2);
      expect(upload.destroyQuietly).toHaveBeenCalledWith('CleanZ/uploads/new', {
        authenticated: true,
      });
      expect(upload.destroyQuietly).toHaveBeenCalledWith(
        'CleanZ/uploads/legacy',
        { authenticated: false },
      );
      expect(deleted).toEqual(['new', 'legacy']);
    });

    /** Xoá bản ghi khi file chưa xoá được thì mất luôn `storagePublicId` → rác vô chủ. */
    it('storage lỗi → giữ nguyên bản ghi để vòng quét sau thử lại', async () => {
      const { repo, deleted } = makeRepo([
        evidence({ id: 'stuck', storagePublicId: 'CleanZ/uploads/stuck' }),
      ]);
      const upload = { destroyQuietly: jest.fn().mockResolvedValue(false) };
      const service = new IncidentEvidenceLifecycleService(
        repo as never,
        upload as never,
      );

      expect(await service.purgeAbandonedUploads(24)).toBe(0);
      expect(deleted).toEqual([]);
    });

    it('bản ghi không có file trên storage vẫn được dọn', async () => {
      const { repo, deleted } = makeRepo([
        evidence({ id: 'no-file', storagePublicId: null }),
      ]);
      const upload = { destroyQuietly: jest.fn() };
      const service = new IncidentEvidenceLifecycleService(
        repo as never,
        upload as never,
      );

      expect(await service.purgeAbandonedUploads(24)).toBe(1);
      expect(upload.destroyQuietly).not.toHaveBeenCalled();
      expect(deleted).toEqual(['no-file']);
    });
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
