import { TaskerService } from './tasker.service';

type UploadField =
  | 'avatar'
  | 'docFront'
  | 'docBack'
  | 'criminalRecord'
  | 'healthCertificate'
  | 'certificate';

interface UploadInput {
  field: UploadField;
  file: Express.Multer.File;
}

interface BatchService {
  uploadTaskerDocuments(
    provided: UploadInput[],
  ): Promise<
    Array<{ field: UploadField; upload: { url: string; public_id: string } }>
  >;
}

function file(originalname: string): Express.Multer.File {
  return { originalname } as Express.Multer.File;
}

function makeService(uploadService: {
  uploadImage: jest.Mock;
  deleteImage: jest.Mock;
}): BatchService {
  return new TaskerService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    uploadService as never,
    {} as never,
    {} as never,
    {} as never,
  ) as unknown as BatchService;
}

describe('TaskerService document upload batches', () => {
  it('uploads at most two documents concurrently and preserves field order', async () => {
    let activeUploads = 0;
    let maxActiveUploads = 0;
    const uploadService = {
      uploadImage: jest.fn(
        async (
          input: Express.Multer.File,
        ): Promise<{
          url: string;
          public_id: string;
        }> => {
          activeUploads += 1;
          maxActiveUploads = Math.max(maxActiveUploads, activeUploads);
          await new Promise<void>((resolve) => setImmediate(resolve));
          activeUploads -= 1;
          return {
            url: `https://cdn/${input.originalname}`,
            public_id: `asset-${input.originalname}`,
          };
        },
      ),
      deleteImage: jest.fn(),
    };
    const service = makeService(uploadService);
    const inputs: UploadInput[] = [
      { field: 'avatar', file: file('avatar') },
      { field: 'docFront', file: file('front') },
      { field: 'docBack', file: file('back') },
      { field: 'criminalRecord', file: file('criminal') },
      { field: 'healthCertificate', file: file('health') },
      { field: 'certificate', file: file('certificate') },
    ];

    const result = await service.uploadTaskerDocuments(inputs);

    expect(maxActiveUploads).toBe(2);
    expect(result.map(({ field }) => field)).toEqual(
      inputs.map(({ field }) => field),
    );
    expect(uploadService.deleteImage).not.toHaveBeenCalled();
  });

  it('cleans successful uploads and stops later batches when one upload fails', async () => {
    const uploadService = {
      uploadImage: jest.fn((input: Express.Multer.File) => {
        if (input.originalname === 'front') {
          return Promise.reject(new Error('Request Timeout'));
        }
        return Promise.resolve({
          url: `https://cdn/${input.originalname}`,
          public_id: `asset-${input.originalname}`,
        });
      }),
      deleteImage: jest.fn().mockResolvedValue({ message: 'deleted' }),
    };
    const service = makeService(uploadService);

    await expect(
      service.uploadTaskerDocuments([
        { field: 'avatar', file: file('avatar') },
        { field: 'docFront', file: file('front') },
        { field: 'docBack', file: file('back') },
      ]),
    ).rejects.toThrow('Request Timeout');

    expect(uploadService.uploadImage).toHaveBeenCalledTimes(2);
    expect(uploadService.deleteImage).toHaveBeenCalledTimes(1);
    expect(uploadService.deleteImage).toHaveBeenCalledWith('asset-avatar');
  });
});
