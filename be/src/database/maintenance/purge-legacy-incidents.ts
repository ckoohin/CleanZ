/**
 * Dọn dữ liệu sự cố sinh ra bởi LUỒNG NGHIỆP VỤ CŨ (trước đợt rút gọn 7 trạng thái).
 *
 * Vì sao phải dọn: các hồ sơ này được settle bằng `reference_type = 'INCIDENT_COMPENSATION'`
 * chưa gắn version, hoặc bị seed thẳng vào COMPENSATED/CLOSED mà không có
 * `recoverable`/`uncovered`. `IncidentReconciliationService` đối soát theo ref versioned nên
 * đọc chúng thành "không có REFUND cho khách" và bắn CRITICAL — mỗi 15 phút, vĩnh viễn. Một
 * kênh cảnh báo lúc nào cũng đỏ thì tương đương không có cảnh báo: chênh lệch thật sau này
 * sẽ chìm trong nhiễu.
 *
 * PHẠM VI — chọn theo DẤU HIỆU TƯỜNG MINH, không quét theo kiểu "mọi thứ không phải bộ mới":
 *   • title bắt đầu bằng [SEED-TASKER-COMP] / [SEED-FULLFLOW] / [SEED-INC]
 *   • incident_code dạng `INC-00x` (seed-dev-data mốc 2026-06-23)
 * Nhờ vậy hồ sơ do người dùng tự tạo trên UI trong lúc test KHÔNG bị đụng tới.
 *
 * KHÔNG xoá `wallet_transactions`. Số dư ví được suy ra từ chính các bút toán đó; xoá đi là
 * ví và sổ cái lệch nhau vĩnh viễn. Bút toán cũ trỏ tới một sự cố không còn tồn tại thì vô
 * hại — đối soát chỉ quét từ bảng `incidents` — và nó vẫn là ghi chép trung thực về số tiền
 * đã thực sự chạy qua ví. Riêng phần đang TẠM GIỮ thì phải nhả đúng qua ledger trước khi xoá
 * hồ sơ, nếu không tiền treo lại vĩnh viễn trong `hold_balance`.
 *
 * KHÔNG xoá `bookings`: booking không có sự cố là trạng thái bình thường, và một số booking
 * (BK1001…) thuộc bộ dev-data dùng chung cho các feature khác.
 *
 * Chạy (mặc định DRY RUN — chỉ in ra sẽ xoá gì):
 *   node -r ts-node/register -r tsconfig-paths/register src/database/maintenance/purge-legacy-incidents.ts
 *   APPLY=1 node -r ts-node/register -r tsconfig-paths/register src/database/maintenance/purge-legacy-incidents.ts
 */
import { NestFactory } from '@nestjs/core';
import { DataSource, EntityManager } from 'typeorm';
import { AppModule } from '../../app.module';
import { IncidentEntity } from '../../modules/incident/entity/incident.entity';
import { IncidentDepositHoldService } from '../../modules/incident/services/incident-deposit-hold.service';

const LEGACY_TITLE_TAGS = [
  '[SEED-TASKER-COMP]%',
  '[SEED-FULLFLOW]%',
  '[SEED-INC]%',
];
const LEGACY_CODE_PATTERN = 'INC-%';

/** Điều kiện chọn hồ sơ cũ, dùng chung cho mọi truy vấn bên dưới. */
const LEGACY_WHERE = `(i.title LIKE ANY($1) OR i.incident_code LIKE $2)`;
const LEGACY_PARAMS: [string[], string] = [
  LEGACY_TITLE_TAGS,
  LEGACY_CODE_PATTERN,
];

interface Target {
  id: string;
  incident_code: string | null;
  status: string;
  title: string;
  held: string | null;
}

const vnd = (n: number) => `${n.toLocaleString('vi-VN')}đ`;

async function findTargets(ds: DataSource): Promise<Target[]> {
  return ds.query<Target[]>(
    `SELECT i.id, i.incident_code, i.status, i.title,
            i.tasker_wallet_hold_amount AS held
       FROM incidents i
      WHERE ${LEGACY_WHERE}
      ORDER BY i.incident_code`,
    LEGACY_PARAMS,
  );
}

async function countDependents(
  ds: DataSource,
): Promise<{ label: string; n: number }[]> {
  const one = async (
    label: string,
    sql: string,
  ): Promise<{ label: string; n: number }> => {
    const [r] = await ds.query<{ n: number }[]>(sql, LEGACY_PARAMS);
    return { label, n: r.n };
  };
  return Promise.all([
    one(
      'hạng mục thiệt hại',
      `SELECT count(*)::int n FROM incident_damage_items d
         JOIN incidents i ON i.id = d.incident_id WHERE ${LEGACY_WHERE}`,
    ),
    one(
      'bằng chứng',
      `SELECT count(*)::int n FROM incident_evidences e
         JOIN incidents i ON i.id = e.incident_id WHERE ${LEGACY_WHERE}`,
    ),
    one(
      'giải trình',
      `SELECT count(*)::int n FROM incident_statements s
         JOIN incidents i ON i.id = s.incident_id WHERE ${LEGACY_WHERE}`,
    ),
    one(
      'nhật ký trạng thái',
      `SELECT count(*)::int n FROM incident_status_logs l
         JOIN incidents i ON i.id = l.incident_id WHERE ${LEGACY_WHERE}`,
    ),
    one(
      'phản hồi quyết định',
      `SELECT count(*)::int n FROM incident_decision_responses r
         JOIN incidents i ON i.id = r.incident_id WHERE ${LEGACY_WHERE}`,
    ),
    one(
      'khoản nợ Tasker',
      `SELECT count(*)::int n FROM tasker_debts d
         JOIN incidents i ON i.id::text = d.source_ref_id::text WHERE ${LEGACY_WHERE}`,
    ),
    one(
      'thông báo chờ gửi',
      `SELECT count(*)::int n FROM notification_outbox o
         JOIN incidents i ON i.id::text = o.ref_id::text WHERE ${LEGACY_WHERE}`,
    ),
    one(
      'strike khai gian',
      `SELECT count(*)::int n FROM customer_incident_strikes s
         JOIN incidents i ON i.id = s.incident_id WHERE ${LEGACY_WHERE}`,
    ),
  ]);
}

/**
 * Nhả phần ví đang tạm giữ TRƯỚC khi xoá hồ sơ — qua `release()` để có bút toán
 * DEPOSIT_RELEASE, giữ ví và sổ cái khớp nhau.
 */
async function releaseHolds(
  manager: EntityManager,
  depositHold: IncidentDepositHoldService,
  ids: string[],
): Promise<number> {
  const incidents = await manager.getRepository(IncidentEntity).find({
    where: ids.map((id) => ({ id })),
    relations: ['tasker'],
  });
  let total = 0;
  for (const incident of incidents) {
    total += await depositHold.release(manager, incident, incident.tasker);
  }
  return total;
}

/**
 * Thông báo trỏ tới sự cố đã bị xoá ở đâu đó khác (vd: `RESET=1` của seed các đợt trước).
 * Đều là bản ghi đã SENT nên không gây gửi nhầm, nhưng để lại thì bảng outbox phình dần
 * bằng dữ liệu không còn đối chiếu được với hồ sơ nào.
 */
async function purgeOrphanOutbox(
  ds: DataSource,
  apply: boolean,
): Promise<number> {
  const [{ n }] = await ds.query<{ n: number }[]>(
    `SELECT count(*)::int n FROM notification_outbox o
      WHERE o.ref_type = 'INCIDENT'
        AND NOT EXISTS (SELECT 1 FROM incidents i WHERE i.id::text = o.ref_id::text)`,
  );
  if (n > 0 && apply) {
    await ds.query(
      `DELETE FROM notification_outbox o
        WHERE o.ref_type = 'INCIDENT'
          AND NOT EXISTS (SELECT 1 FROM incidents i WHERE i.id::text = o.ref_id::text)`,
    );
  }
  return n;
}

async function main() {
  const apply = process.env.APPLY === '1';
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const ds = app.get(DataSource);
    const depositHold = app.get(IncidentDepositHoldService);

    const targets = await findTargets(ds);
    if (targets.length === 0) {
      console.log('✅ Không còn hồ sơ sự cố thuộc luồng cũ.');
      const orphans = await purgeOrphanOutbox(ds, apply);
      console.log(
        `   Thông báo mồ côi: ${orphans}${orphans > 0 && !apply ? ' (APPLY=1 để xoá)' : apply ? ' — đã xoá' : ''}`,
      );
      return;
    }

    const heldTotal = targets.reduce((s, t) => s + Number(t.held ?? 0), 0);
    const holders = targets.filter((t) => Number(t.held ?? 0) > 0);

    console.log(
      `${apply ? '🔥 THỰC THI' : '🔎 DRY RUN'} — ${targets.length} hồ sơ thuộc luồng cũ:\n`,
    );
    for (const t of targets) {
      const held = Number(t.held ?? 0);
      console.log(
        `  ${(t.incident_code ?? t.id).padEnd(18)} ${t.status.padEnd(18)}` +
          `${held > 0 ? `giữ ${vnd(held)}  ` : ''}${t.title.slice(0, 46)}`,
      );
    }

    console.log('\n  Bản ghi phụ thuộc sẽ mất theo:');
    for (const d of await countDependents(ds)) {
      console.log(`    ${d.label.padEnd(24)} ${d.n}`);
    }
    console.log(
      `\n  Ví đang tạm giữ cần nhả lại: ${vnd(heldTotal)} trên ${holders.length} hồ sơ.`,
    );
    console.log(
      '  Bút toán ví (wallet_transactions) được GIỮ NGUYÊN — xoá sẽ làm ví lệch sổ cái.',
    );

    if (!apply) {
      console.log('\nChạy lại với APPLY=1 để thực hiện.');
      return;
    }

    const ids = targets.map((t) => t.id);
    const released = await ds.transaction(async (manager) => {
      const releasedAmount = await releaseHolds(manager, depositHold, ids);
      await manager.query(
        `DELETE FROM notification_outbox WHERE ref_id::text = ANY($1)`,
        [ids],
      );
      await manager.query(
        `DELETE FROM customer_incident_strikes WHERE incident_id = ANY($1)`,
        [ids],
      );
      await manager.query(
        `DELETE FROM tasker_debts WHERE source_ref_id::text = ANY($1)`,
        [ids],
      );
      // Hạng mục / bằng chứng / giải trình / log / phản hồi đi theo ON DELETE CASCADE.
      await manager.query(`DELETE FROM incidents WHERE id = ANY($1)`, [ids]);
      return releasedAmount;
    });

    const orphans = await purgeOrphanOutbox(ds, apply);
    console.log(
      `\n✅ Đã xoá ${targets.length} hồ sơ cũ, ${orphans} thông báo mồ côi, ` +
        `và nhả lại ${vnd(released)} tiền tạm giữ.`,
    );
    const remaining = await findTargets(ds);
    console.log(`   Còn sót: ${remaining.length} (kỳ vọng 0).`);
  } finally {
    await app.close();
  }
}

main().catch((e: Error) => {
  console.error('Dọn dữ liệu sự cố cũ lỗi:', e?.message ?? e);
  process.exit(1);
});
