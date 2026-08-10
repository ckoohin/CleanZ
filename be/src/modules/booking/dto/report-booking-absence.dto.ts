import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export function getTrustedAbsenceProofAssetKey(
  value: string,
  cloudName = process.env.CLOUDINARY_CLOUD_NAME,
): string | null {
  if (!cloudName?.trim()) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.hostname.toLowerCase() !== 'res.cloudinary.com' ||
      url.port ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    const segments = decodeURIComponent(url.pathname)
      .split('/')
      .filter(Boolean);
    const uploadFolder = segments.findIndex(
      (segment, index) =>
        segment === 'CleanZ' && segments[index + 1] === 'uploads',
    );
    const trusted =
      segments[0] === cloudName.trim() &&
      segments[1] === 'image' &&
      segments[2] === 'upload' &&
      uploadFolder >= 3;
    if (!trusted) return null;
    const assetSegments = segments.slice(uploadFolder);
    const lastIndex = assetSegments.length - 1;
    assetSegments[lastIndex] = assetSegments[lastIndex].replace(
      /\.[a-z0-9]+$/i,
      '',
    );
    return assetSegments.join('/');
  } catch {
    return null;
  }
}

export function isTrustedAbsenceProofPhotoUrl(
  value: string,
  cloudName = process.env.CLOUDINARY_CLOUD_NAME,
): boolean {
  return getTrustedAbsenceProofAssetKey(value, cloudName) !== null;
}

export class ReportBookingAbsenceDto {
  @ApiProperty({
    example: 'https://cdn.cleanz.online/uploads/customer-absence-proof.jpg',
    description: 'Ảnh địa chỉ/hiện trường khách hàng để Admin đối chiếu',
  })
  @IsString()
  @IsUrl({
    protocols: ['https'],
    require_protocol: true,
    require_tld: false,
  })
  @MaxLength(500)
  proofPhotoUrl!: string;

  @ApiProperty({
    example:
      'https://cdn.cleanz.online/uploads/customer-absence-call-history.jpg',
    description: 'Ảnh chụp lịch sử cuộc gọi cho khách hàng',
  })
  @IsString()
  @IsUrl({
    protocols: ['https'],
    require_protocol: true,
    require_tld: false,
  })
  @MaxLength(500)
  callHistoryPhotoUrl!: string;

  @ApiProperty({ required: false, maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
