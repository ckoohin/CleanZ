import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface GoongDirectionsResponse {
  routes?: Array<{
    overview_polyline?: {
      points?: string;
    };
    legs?: Array<{
      distance?: {
        value?: number;
      };
      duration?: {
        value?: number;
      };
    }>;
  }>;
}

export interface GoongRouteSummary {
  distance: {
    meters: number;
    kilometers: number;
  };
  duration: {
    seconds: number;
    minutes: number;
  };
  encodedPolyline?: string | null;
}

@Injectable()
export class GoongMapService {
  constructor(private readonly configService: ConfigService) {}

  async calculateDrivingRoute(input: {
    originLatitude: number;
    originLongitude: number;
    destinationLatitude: number;
    destinationLongitude: number;
  }): Promise<GoongRouteSummary> {
    const apiKey = this.configService.get<string>('GOONG_MAPS_API_KEY');
    if (!apiKey) {
      throw new NotFoundException('Thiếu cấu hình GOONG_MAPS_API_KEY');
    }

    const url = new URL('https://rsapi.goong.io/Direction');
    url.searchParams.set(
      'origin',
      `${input.originLatitude},${input.originLongitude}`,
    );
    url.searchParams.set(
      'destination',
      `${input.destinationLatitude},${input.destinationLongitude}`,
    );
    url.searchParams.set('vehicle', 'car');
    url.searchParams.set('api_key', apiKey);

    const response = await fetch(url);
    if (!response.ok) {
      throw new BadRequestException('Không thể tính khoảng cách bằng Goong');
    }

    const data = (await response.json()) as GoongDirectionsResponse;
    const leg = data.routes?.[0]?.legs?.[0];
    const distanceMeters = this.parseNumber(
      leg?.distance?.value,
      'Không thể tính khoảng cách booking',
    );
    const durationSeconds = this.parseNumber(
      leg?.duration?.value,
      'Không thể tính thời gian di chuyển',
    );

    return {
      distance: {
        meters: distanceMeters,
        kilometers: Number((distanceMeters / 1000).toFixed(2)),
      },
      duration: {
        seconds: durationSeconds,
        minutes: Number((durationSeconds / 60).toFixed(0)),
      },
      encodedPolyline: data.routes?.[0]?.overview_polyline?.points ?? null,
    };
  }

  private parseNumber(
    value: number | null | undefined,
    message: string,
  ): number {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) {
      throw new BadRequestException(message);
    }

    return Number(parsedValue.toFixed(2));
  }
}
