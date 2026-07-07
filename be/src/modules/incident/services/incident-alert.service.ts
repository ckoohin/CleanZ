import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type AlertSeverity = 'WARNING' | 'CRITICAL';

/**
 * P2 — Gửi cảnh báo vận hành ra kênh thật (Slack/generic incoming webhook nhận `{text}`).
 * Luôn `logger.warn('[ALERT] …')` (giữ hành vi cũ + để log-monitoring bắt); nếu có
 * `INCIDENT_ALERT_WEBHOOK_URL` thì POST thêm ra webhook, throttle theo key để không spam.
 * Không cấu hình webhook → chỉ log (an toàn cho dev/test, không phụ thuộc mạng).
 */
@Injectable()
export class IncidentAlertService {
  private readonly logger = new Logger(IncidentAlertService.name);
  private readonly webhookUrl?: string;
  private readonly minIntervalMs: number;
  private readonly lastSent = new Map<string, number>();

  constructor(config: ConfigService) {
    this.webhookUrl =
      config.get<string>('INCIDENT_ALERT_WEBHOOK_URL')?.trim() || undefined;
    this.minIntervalMs = Number(
      config.get<string>('INCIDENT_ALERT_MIN_INTERVAL_MS') ?? 30 * 60_000,
    );
  }

  /** Trả về true nếu đã gửi webhook (không tính lần chỉ log/bị throttle). */
  async send(
    key: string,
    message: string,
    severity: AlertSeverity = 'WARNING',
  ): Promise<boolean> {
    this.logger.warn(`[ALERT] ${message}`);
    if (!this.webhookUrl) return false;

    const now = Date.now();
    if (now - (this.lastSent.get(key) ?? 0) < this.minIntervalMs) return false;
    this.lastSent.set(key, now);

    const emoji = severity === 'CRITICAL' ? '🔴' : '🟠';
    try {
      const res = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `${emoji} [CleanZ] ${message}` }),
      });
      if (!res.ok) {
        this.logger.error(`Alert webhook trả HTTP ${res.status}`);
        return false;
      }
      return true;
    } catch (e) {
      // Không để lỗi webhook làm hỏng housekeeping.
      this.logger.error(`Alert webhook lỗi: ${String(e)}`);
      return false;
    }
  }
}
