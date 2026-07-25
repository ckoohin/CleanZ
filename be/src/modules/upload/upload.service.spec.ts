import { Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';
import { UploadService } from './upload.service';

jest.mock('cloudinary', () => ({
  v2: {
    uploader: {
      upload_stream: jest.fn(),
      destroy: jest.fn(),
    },
  },
}));

jest.mock('streamifier', () => ({
  createReadStream: jest.fn(),
}));

describe('UploadService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses a 120-second Cloudinary timeout and does not log asset URLs', async () => {
    const uploadStream = {};
    const pipe = jest.fn();
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();

    (streamifier.createReadStream as jest.Mock).mockReturnValue({ pipe });
    (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
      (options, callback) => {
        callback(undefined, {
          secure_url: 'https://res.cloudinary.com/example/kyc.jpg',
          public_id: 'CleanZ/uploads/kyc',
        });
        return uploadStream;
      },
    );

    const service = new UploadService();
    const result = await service.uploadImage({
      buffer: Buffer.from('image'),
    } as Express.Multer.File);

    expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: 120_000 }),
      expect.any(Function),
    );
    expect(pipe).toHaveBeenCalledWith(uploadStream);
    expect(result).toEqual({
      url: 'https://res.cloudinary.com/example/kyc.jpg',
      public_id: 'CleanZ/uploads/kyc',
    });
    expect(log).toHaveBeenCalledWith('Upload success');
    expect(log).not.toHaveBeenCalledWith(
      expect.stringContaining('res.cloudinary.com'),
    );
  });
});
