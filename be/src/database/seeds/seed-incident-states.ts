/**
 * Seed sự cố PHỦ ĐỦ 7 TRẠNG THÁI của luồng mới, để Admin test UI mà không phải tự dựng
 * từng ca. Mọi bản ghi đều đi qua service thật (createFromTicket → accept → saveDecision →
 * sendToTasker → finalizeDecision → compensate) nên state-machine, snapshot chính sách,
 * ví và sổ nợ đều đúng như đi qua API.
 *
 * Dữ liệu có nguồn gốc đầy đủ — mỗi sự cố gắn với một chuỗi thật:
 *   Customer ──▶ Booking COMPLETED ──▶ Ticket PROPERTY_DAMAGE ──▶ Incident ──▶ (ví/sổ nợ)
 *   └ Tasker chuyên dụng của seed (ví nạp sẵn, KYC APPROVED), không mượn tasker có sẵn.
 *
 * Bốn Tasker để tách biệt các ca tiền bạc (ví bị HOLD mỗi lần Admin tiếp nhận, nên tasker
 * nào gánh nhiều kịch bản thì phải có ví dày hơn):
 *   • tasker.rich@cleanz.local    — ví 30.000.000đ → thu hồi đủ, KHÔNG sinh nợ
 *   • tasker.poor@cleanz.local    — ví    300.000đ → ví mỏng, dùng cho các ca chờ xử lý
 *   • tasker.partial@cleanz.local — ví  1.200.000đ → thu hồi ĐƯỢC MỘT PHẦN, phần thiếu thành nợ
 *   • tasker.debt@cleanz.local    — ví    200.000đ → sinh nợ và BỊ LÙI NGÀY để test xoá nợ
 *
 * Ma trận kịch bản (trần chính sách mặc định 10.000.000đ):
 *   S01 REPORTED          — chờ tiếp nhận
 *   S02 REVIEWING         — đã tiếp nhận, chưa soạn quyết định (nhiều hạng mục)
 *   S03 REVIEWING         — đã lưu nháp quyết định, chưa gửi/chốt
 *   S04 AWAITING_RESPONSE — đã gửi Tasker, CÒN hạn → chốt phải bị chặn
 *   S05 AWAITING_RESPONSE — đã gửi Tasker, HẾT hạn → chốt được ngay
 *   S06 AWAITING_RESPONSE — Tasker đã phản hồi DISAGREE → chốt được, có phản biện để đọc
 *   S07 AWAITING_PAYOUT   — nền tảng chịu 100%, chờ chi trả (test cả digital lẫn thủ công)
 *   S08 AWAITING_PAYOUT   — chia đôi Tasker/nền tảng, chờ chi trả
 *   S09 COMPENSATED       — đã chi, ví Tasker đủ → không nợ (test ĐẢO bồi thường trong 72h)
 *   S10 COMPENSATED       — đã chi, ví Tasker thiếu → CÒN NỢ (chưa đủ tuổi xoá)
 *   S11 COMPENSATED       — còn nợ, nợ đã 100 ngày → test nút XOÁ NỢ
 *   S12 REJECTED          — bác bỏ (báo cáo sai sự thật)
 *   S13 CLOSED            — công nhận nhưng không bồi thường
 *
 * Idempotent theo title prefix [SEED-STATE]; đặt FORCE=1 để tạo thêm một bộ mới.
 *
 * Chạy:
 *   node -r ts-node/register -r tsconfig-paths/register src/database/seeds/seed-incident-states.ts
 */
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../../app.module';
import { IncidentAdminService } from '../../modules/incident/services/incident-admin.service';
import { IncidentDecisionService } from '../../modules/incident/services/incident-decision.service';
import { CompensationExecutorService } from '../../modules/incident/services/compensation-executor.service';
import { IncidentTaskerService } from '../../modules/incident/services/incident-tasker.service';
import { WalletService } from '../../modules/wallet/wallet.service';
import { TaskerEntity } from '../../modules/tasker/entity/tasker.entity';
import { WalletTransactionType } from '../../common/enums/wallet-transaction-type.enum';
import { IncidentDecisionOutcome } from '../../common/enums/incident-decision-outcome.enum';
import { IncidentResponsibilityParty } from '../../common/enums/incident-responsibility-party.enum';
import { IncidentDecisionResponseType } from '../../common/enums/incident-decision-response-type.enum';
import { IncidentAdminView } from '../../modules/incident/dto/incident-response.dto';

const SEED_TAG = '[SEED-STATE]';
const PASSWORD = 'Tasker@123';
const SYSTEM_FUND = 80_000_000;
const WRITE_OFF_AGE_DAYS = 100;

const rand = (n = 4) =>
  Math.random()
    .toString(36)
    .slice(2, 2 + n)
    .toUpperCase();
const ymd = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};
const vnd = (n: number) => `${n.toLocaleString('vi-VN')}đ`;

type TaskerKey = 'rich' | 'poor' | 'partial' | 'debt';

const TASKER_PROFILES: Record<
  TaskerKey,
  { email: string; fullName: string; balance: number }
> = {
  rich: {
    email: 'tasker.rich@cleanz.local',
    fullName: 'Trần Minh Khoa (seed — ví dày)',
    // Mỗi lần Admin tiếp nhận là ví bị HOLD một khoản; tasker này gánh 8 kịch bản nên
    // cần dư nhiều, nếu không S09 sẽ hết số khả dụng và sinh nợ ngoài ý đồ.
    balance: 30_000_000,
  },
  poor: {
    email: 'tasker.poor@cleanz.local',
    fullName: 'Lê Thị Hồng (seed — ví mỏng)',
    balance: 300_000,
  },
  // Chỉ gánh S10 để ví không bị các kịch bản khác giữ mất — có vậy mới ra được ca
  // "thu hồi ĐƯỢC MỘT PHẦN" thay vì mất trắng.
  partial: {
    email: 'tasker.partial@cleanz.local',
    fullName: 'Ngô Thanh Tùng (seed — thu hồi một phần)',
    balance: 1_200_000,
  },
  debt: {
    email: 'tasker.debt@cleanz.local',
    fullName: 'Phạm Văn Dũng (seed — nợ tồn đọng)',
    balance: 200_000,
  },
};

/**
 * Khách hàng seed — tạo riêng thay vì mượn customer có sẵn, vì phần lớn customer trong DB
 * dev đang không gắn user nào (`user_id IS NULL`): ticket sẽ thiếu người báo cáo và không
 * ai đăng nhập được để xem kết quả bồi thường từ phía khách.
 */
const CUSTOMER_PROFILES = [
  { email: 'customer.a@cleanz.local', fullName: 'Đỗ Thu Hà (seed)' },
  { email: 'customer.b@cleanz.local', fullName: 'Bùi Quốc Huy (seed)' },
  { email: 'customer.c@cleanz.local', fullName: 'Vũ Ngọc Mai (seed)' },
];

/** Trạng thái đích của từng kịch bản — quyết định seed dừng ở bước nào. */
type Stage =
  | 'REPORTED'
  | 'REVIEWING'
  | 'DRAFTED'
  | 'SENT'
  | 'SENT_EXPIRED'
  | 'RESPONDED'
  | 'FINALIZED'
  | 'COMPENSATED';

interface Decision {
  outcome: IncidentDecisionOutcome;
  /** Số tiền duyệt cho từng hạng mục, theo đúng thứ tự `items`. */
  approved?: number[];
  party?: IncidentResponsibilityParty;
  taskerBorne?: number;
  platformBorne?: number;
}

interface Scenario {
  key: string;
  tasker: TaskerKey;
  title: string;
  description: string;
  items: { description: string; claimed: number }[];
  stage: Stage;
  decision?: Decision;
  /** Lùi ngày tạo khoản nợ để mở nút "Xoá nợ". */
  ageDebtDays?: number;
  note: string;
}

const SCENARIOS: Scenario[] = [
  {
    key: 'S01',
    tasker: 'rich',
    title: `${SEED_TAG} S01 REPORTED — chờ tiếp nhận`,
    description:
      'Khách báo vỡ mặt kính bàn trà khi Tasker kéo bàn để hút bụi. Sự cố vừa lập từ ticket, chưa ai tiếp nhận.',
    items: [{ description: 'Mặt kính cường lực bàn trà', claimed: 800_000 }],
    stage: 'REPORTED',
    note: 'Test nút "Tiếp nhận thẩm định".',
  },
  {
    key: 'S02',
    tasker: 'rich',
    title: `${SEED_TAG} S02 REVIEWING — chưa soạn quyết định`,
    description:
      'Trầy xước sàn gỗ do kéo máy hút bụi công nghiệp. Đã tiếp nhận, đang chờ Admin thẩm định từng hạng mục.',
    items: [
      { description: 'Vệt xước dài trên sàn gỗ phòng ngủ', claimed: 900_000 },
      { description: 'Nẹp gỗ chân tường bị bong', claimed: 300_000 },
    ],
    stage: 'REVIEWING',
    note: 'Test soạn quyết định nhiều hạng mục, mỗi hạng mục một số duyệt.',
  },
  {
    key: 'S03',
    tasker: 'rich',
    title: `${SEED_TAG} S03 REVIEWING — đã có nháp quyết định`,
    description:
      'Nứt bồn rửa lavabo khi vệ sinh. Admin đã lưu nháp quyết định nhưng chưa gửi Tasker, chưa chốt.',
    items: [{ description: 'Bồn rửa lavabo bị nứt mép', claimed: 1_500_000 }],
    stage: 'DRAFTED',
    decision: {
      outcome: IncidentDecisionOutcome.COMPENSATE,
      approved: [1_200_000],
      party: IncidentResponsibilityParty.SHARED,
      taskerBorne: 600_000,
      platformBorne: 600_000,
    },
    note: 'Test sửa nháp (decisionVersion tăng) và kiểm tra optimistic lock.',
  },
  {
    key: 'S04',
    tasker: 'rich',
    title: `${SEED_TAG} S04 AWAITING_RESPONSE — còn hạn phản biện`,
    description:
      'Rách mặt ngồi sofa da khi di chuyển. Quyết định bắt Tasker chịu đã gửi, vẫn trong thời hạn phản biện.',
    items: [{ description: 'Mặt ngồi sofa da bị rách', claimed: 3_000_000 }],
    stage: 'SENT',
    decision: {
      outcome: IncidentDecisionOutcome.COMPENSATE,
      approved: [2_400_000],
      party: IncidentResponsibilityParty.TASKER,
      taskerBorne: 2_400_000,
      platformBorne: 0,
    },
    note: 'Chốt phải bị chặn: TASKER_RESPONSE_WAITING.',
  },
  {
    key: 'S05',
    tasker: 'rich',
    title: `${SEED_TAG} S05 AWAITING_RESPONSE — hết hạn, Tasker im lặng`,
    description:
      'Vỡ đèn trang trí trần phòng khách. Đã gửi Tasker phản biện nhưng hết hạn không phản hồi.',
    items: [{ description: 'Đèn thả trần phòng khách', claimed: 1_800_000 }],
    stage: 'SENT_EXPIRED',
    decision: {
      outcome: IncidentDecisionOutcome.COMPENSATE,
      approved: [1_500_000],
      party: IncidentResponsibilityParty.TASKER,
      taskerBorne: 1_500_000,
      platformBorne: 0,
    },
    note: 'Chốt được ngay vì đã quá hạn — test đường "im lặng coi như chấp nhận".',
  },
  {
    key: 'S06',
    tasker: 'poor',
    title: `${SEED_TAG} S06 AWAITING_RESPONSE — Tasker đã phản biện`,
    description:
      'Gãy chân kệ tivi. Tasker phản hồi KHÔNG ĐỒNG Ý, cho rằng kệ đã lỏng ốc từ trước.',
    items: [{ description: 'Chân kệ tivi bị gãy', claimed: 1_200_000 }],
    stage: 'RESPONDED',
    decision: {
      outcome: IncidentDecisionOutcome.COMPENSATE,
      approved: [1_000_000],
      party: IncidentResponsibilityParty.TASKER,
      taskerBorne: 1_000_000,
      platformBorne: 0,
    },
    note: 'Có phản biện để Admin đọc rồi giảm phần Tasker chịu hoặc chốt nguyên.',
  },
  {
    key: 'S07',
    tasker: 'rich',
    title: `${SEED_TAG} S07 AWAITING_PAYOUT — nền tảng chịu 100%`,
    description:
      'Hỏng máy lọc nước do lỗi quy trình đào tạo của CleanZ. Đã chốt, chờ chi trả cho khách.',
    items: [
      { description: 'Máy lọc nước RO bị hỏng bo mạch', claimed: 2_200_000 },
    ],
    stage: 'FINALIZED',
    decision: {
      outcome: IncidentDecisionOutcome.COMPENSATE,
      approved: [2_000_000],
      party: IncidentResponsibilityParty.PLATFORM,
      taskerBorne: 0,
      platformBorne: 2_000_000,
    },
    note: 'Test cả "Chi trả qua ví" lẫn "Chi trả thủ công + ảnh minh chứng".',
  },
  {
    key: 'S08',
    tasker: 'poor',
    title: `${SEED_TAG} S08 AWAITING_PAYOUT — chia đôi trách nhiệm`,
    description:
      'Ố màu mặt đá bếp do dùng sai hoá chất. Lỗi chia đôi giữa Tasker và nền tảng. Đã chốt, chờ chi trả.',
    items: [{ description: 'Mặt đá bếp bị ố hoá chất', claimed: 3_000_000 }],
    stage: 'FINALIZED',
    decision: {
      outcome: IncidentDecisionOutcome.COMPENSATE,
      approved: [2_600_000],
      party: IncidentResponsibilityParty.SHARED,
      taskerBorne: 1_300_000,
      platformBorne: 1_300_000,
    },
    note: 'Chi xong sẽ sinh nợ (ví Tasker mỏng) — xem cột "Nợ tồn đọng".',
  },
  {
    key: 'S09',
    tasker: 'rich',
    title: `${SEED_TAG} S09 COMPENSATED — đã chi, thu hồi đủ`,
    description:
      'Vỡ bình hoa gốm sứ trưng bày. Đã chi trả xong, ví Tasker đủ nên thu hồi trọn, không phát sinh nợ.',
    items: [{ description: 'Bình hoa gốm Bát Tràng', claimed: 1_000_000 }],
    stage: 'COMPENSATED',
    decision: {
      outcome: IncidentDecisionOutcome.COMPENSATE,
      approved: [900_000],
      party: IncidentResponsibilityParty.TASKER,
      taskerBorne: 900_000,
      platformBorne: 0,
    },
    note: 'Test ĐẢO bồi thường trong 72h (nợ = 0 nên đảo được).',
  },
  {
    key: 'S10',
    tasker: 'partial',
    title: `${SEED_TAG} S10 COMPENSATED — còn nợ, chưa đủ tuổi xoá`,
    description:
      'Hỏng rèm cửa tự động khi lau kính. Đã chi trả, ví Tasker không đủ nên phần thiếu thành nợ.',
    items: [{ description: 'Motor rèm cửa tự động', claimed: 2_500_000 }],
    stage: 'COMPENSATED',
    decision: {
      outcome: IncidentDecisionOutcome.COMPENSATE,
      approved: [2_000_000],
      party: IncidentResponsibilityParty.TASKER,
      taskerBorne: 2_000_000,
      platformBorne: 0,
    },
    note: 'Bấm "Xoá nợ" phải bị chặn WRITE_OFF_TOO_EARLY.',
  },
  {
    key: 'S11',
    tasker: 'debt',
    title: `${SEED_TAG} S11 COMPENSATED — nợ 100 ngày, xoá được`,
    description:
      'Làm hỏng máy giặt cửa trước. Tasker đã ngừng nhận đơn, nợ tồn đọng quá lâu không thu hồi được.',
    items: [{ description: 'Bo mạch máy giặt cửa trước', claimed: 3_500_000 }],
    stage: 'COMPENSATED',
    decision: {
      outcome: IncidentDecisionOutcome.COMPENSATE,
      approved: [3_000_000],
      party: IncidentResponsibilityParty.TASKER,
      taskerBorne: 3_000_000,
      platformBorne: 0,
    },
    ageDebtDays: WRITE_OFF_AGE_DAYS,
    note: 'Test nút "Xoá nợ" (lý do ≥ 10 ký tự) rồi hồ sơ mới đóng được.',
  },
  {
    key: 'S12',
    tasker: 'rich',
    title: `${SEED_TAG} S12 REJECTED — bác bỏ khiếu nại`,
    description:
      'Khách báo mất đồng hồ nhưng camera cho thấy Tasker không vào phòng ngủ. Đã bác bỏ.',
    items: [{ description: 'Đồng hồ đeo tay (khai mất)', claimed: 5_000_000 }],
    stage: 'FINALIZED',
    decision: { outcome: IncidentDecisionOutcome.REJECT },
    note: 'Xem hiển thị lý do bác bỏ; strike gian lận chỉ cộng khi chọn rejectAsFraud.',
  },
  {
    key: 'S13',
    tasker: 'rich',
    title: `${SEED_TAG} S13 CLOSED — công nhận nhưng không bồi thường`,
    description:
      'Xước nhẹ cánh tủ bếp, mức hao mòn thông thường. Công nhận có sự việc nhưng không phát sinh bồi thường.',
    items: [{ description: 'Xước nhẹ cánh tủ bếp', claimed: 400_000 }],
    stage: 'FINALIZED',
    decision: { outcome: IncidentDecisionOutcome.NO_COMPENSATION },
    note: 'Đóng hồ sơ không chuyển tiền, không phạt khách.',
  },
];

interface Ctx {
  ds: DataSource;
  adminId: string;
  incidentAdmin: IncidentAdminService;
  decision: IncidentDecisionService;
  compensation: CompensationExecutorService;
  taskerService: IncidentTaskerService;
  taskers: Record<TaskerKey, { taskerId: string; userId: string }>;
  customers: { customerId: string; userId: string }[];
  packageId: string;
}

async function ensureTasker(
  ds: DataSource,
  wallets: WalletService,
  key: TaskerKey,
): Promise<{ taskerId: string; userId: string }> {
  const p = TASKER_PROFILES[key];
  let user = (
    await ds.query<{ id: string }[]>(`SELECT id FROM users WHERE email = $1`, [
      p.email,
    ])
  )[0];
  if (!user) {
    const hash = await bcrypt.hash(PASSWORD, 10);
    user = (
      await ds.query<{ id: string }[]>(
        `INSERT INTO users (email, password_hash, full_name, role, is_active, is_verified, provider)
         VALUES ($1,$2,$3,'TASKER',true,true,'LOCAL') RETURNING id`,
        [p.email, hash, p.fullName],
      )
    )[0];
  }

  let tasker = (
    await ds.query<{ id: string }[]>(
      `SELECT id FROM taskers WHERE user_id = $1`,
      [user.id],
    )
  )[0];
  if (!tasker) {
    tasker = (
      await ds.query<{ id: string }[]>(
        `INSERT INTO taskers
           (user_id, working_address, bio, skills, status, doc_status, doc_reviewed_at,
            doc_issued_date, doc_expired_date, doc_front_url, doc_back_url)
         VALUES ($1,'Quận 1, TP.HCM','Tasker seed test sự cố','Dọn nhà, vệ sinh',
                 'ACTIVE','APPROVED', now(), now() - interval '1 year', now() + interval '4 years',
                 'https://picsum.photos/seed/kyc-front/600/400',
                 'https://picsum.photos/seed/kyc-back/600/400') RETURNING id`,
        [user.id],
      )
    )[0];
  } else {
    await ds.query(
      `UPDATE taskers SET status='ACTIVE', doc_status='APPROVED', doc_reviewed_at=now() WHERE id=$1`,
      [tasker.id],
    );
  }

  // Nạp ví ĐÚNG mức kịch bản cần, và nạp qua ledger để lịch sử ví trên UI khớp số dư.
  await ds.transaction(async (manager) => {
    const entity = await manager
      .getRepository(TaskerEntity)
      .findOneOrFail({ where: { id: tasker.id } });
    const wallet = await wallets.getOrCreateTaskerWallet(manager, entity);
    const gap = p.balance - Number(wallet.balance);
    if (gap === 0) return;
    const input = {
      wallet,
      amount: Math.abs(gap),
      type: WalletTransactionType.ADJUSTMENT,
      referenceType: 'SEED_INCIDENT_STATES',
      referenceId: null,
      description: `Seed: đặt số dư ví về ${vnd(p.balance)}`,
    };
    if (gap > 0) await wallets.creditWallet(manager, input);
    else await wallets.debitWallet(manager, input);
  });

  console.log(`• Tasker ${key.padEnd(4)} ${p.email} — ví ${vnd(p.balance)}`);
  return { taskerId: tasker.id, userId: user.id };
}

/** Trả mọi khoản đang tạm giữ của Tasker seed về số dư — dọn hold của hồ sơ vừa xoá. */
async function releaseSeedTaskerHolds(
  ds: DataSource,
  wallets: WalletService,
): Promise<void> {
  const emails = Object.values(TASKER_PROFILES).map((p) => p.email);
  const rows = await ds.query<{ tasker_id: string; hold: string }[]>(
    `SELECT w.tasker_id, w.hold_balance AS hold
       FROM wallets w
       JOIN taskers t ON t.id = w.tasker_id
       JOIN users u ON u.id = t.user_id
      WHERE u.email = ANY($1) AND w.hold_balance > 0`,
    [emails],
  );
  for (const row of rows) {
    await ds.transaction(async (manager) => {
      const entity = await manager
        .getRepository(TaskerEntity)
        .findOneOrFail({ where: { id: row.tasker_id } });
      const wallet = await wallets.getOrCreateTaskerWallet(manager, entity);
      await wallets.releaseFunds(manager, {
        wallet,
        amount: Number(row.hold),
        type: WalletTransactionType.DEPOSIT_RELEASE,
        referenceType: 'SEED_INCIDENT_STATES',
        description: 'Seed RESET: giải phóng hold của sự cố seed đã xoá',
      });
    });
  }
}

async function ensureCustomer(
  ds: DataSource,
  profile: { email: string; fullName: string },
): Promise<{ customerId: string; userId: string }> {
  let user = (
    await ds.query<{ id: string }[]>(`SELECT id FROM users WHERE email = $1`, [
      profile.email,
    ])
  )[0];
  if (!user) {
    const hash = await bcrypt.hash(PASSWORD, 10);
    user = (
      await ds.query<{ id: string }[]>(
        `INSERT INTO users (email, password_hash, full_name, role, is_active, is_verified, provider)
         VALUES ($1,$2,$3,'CUSTOMER',true,true,'LOCAL') RETURNING id`,
        [profile.email, hash, profile.fullName],
      )
    )[0];
  }
  let customer = (
    await ds.query<{ id: string }[]>(
      `SELECT id FROM customers WHERE user_id = $1`,
      [user.id],
    )
  )[0];
  if (!customer) {
    customer = (
      await ds.query<{ id: string }[]>(
        `INSERT INTO customers (user_id) VALUES ($1) RETURNING id`,
        [user.id],
      )
    )[0];
  }
  console.log(`• Khách  ${profile.email}`);
  return { customerId: customer.id, userId: user.id };
}

/** Quỹ SYSTEM phải đủ để chi trả digital, nếu không luồng chi trả sẽ báo thiếu số dư. */
async function fundSystemWallet(
  ds: DataSource,
  wallets: WalletService,
): Promise<void> {
  await ds.transaction(async (manager) => {
    const wallet = await wallets.getOrCreateSystemWallet(manager);
    const gap = SYSTEM_FUND - Number(wallet.balance);
    if (gap <= 0) return;
    await wallets.creditWallet(manager, {
      wallet,
      amount: gap,
      type: WalletTransactionType.ADJUSTMENT,
      referenceType: 'SEED_INCIDENT_STATES',
      description: 'Seed: nạp quỹ bồi thường cho môi trường test',
    });
  });
  console.log(`• Quỹ SYSTEM: tối thiểu ${vnd(SYSTEM_FUND)}.`);
}

/** Mỗi kịch bản một booking COMPLETED riêng → không vướng ràng buộc 1 incident/booking. */
async function createTicket(
  ctx: Ctx,
  sc: Scenario,
  taskerUserId: string,
  taskerId: string,
): Promise<string> {
  const customer = ctx.customers[SCENARIOS.indexOf(sc) % ctx.customers.length];
  const price = 300_000 + (SCENARIOS.indexOf(sc) % 4) * 50_000;

  const booking = (
    await ctx.ds.query<{ id: string }[]>(
      `INSERT INTO bookings
         (booking_code, customer_id, tasker_id, package_id, address, duration_hours,
          base_price, total_price, status, payment_method, payment_status)
       VALUES ($1,$2,$3,$4,$5,3,$6,$6,'COMPLETED','CASH','PAID')
       RETURNING id`,
      [
        `BKG-${ymd()}-${rand()}${sc.key}`,
        customer.customerId,
        taskerId,
        ctx.packageId,
        `Căn hộ ${sc.key}, Chung cư Sunrise, Quận 7, TP.HCM`,
        price,
      ],
    )
  )[0];

  const ticket = (
    await ctx.ds.query<{ id: string }[]>(
      `INSERT INTO support_tickets
         (ticket_code, subject, description, category, priority, status, source,
          booking_id, reporter_user_id, counterparty_user_id)
       VALUES ($1,$2,$3,'PROPERTY_DAMAGE','HIGH','NEW','CUSTOMER_APP',$4,$5,$6)
       RETURNING id`,
      [
        `TK-${ymd()}-${rand()}${sc.key}`,
        sc.title.replace(SEED_TAG, '').trim(),
        sc.description,
        booking.id,
        customer.userId,
        taskerUserId,
      ],
    )
  )[0];
  return ticket.id;
}

async function addEvidenceAndStatements(
  ctx: Ctx,
  sc: Scenario,
  view: IncidentAdminView,
  taskerUserId: string,
): Promise<void> {
  for (let k = 0; k < view.damageItems.length; k++) {
    await ctx.ds.query(
      `INSERT INTO incident_evidences (incident_id, damage_item_id, file_url, file_type, purpose)
       VALUES ($1,$2,$3,'IMAGE','DAMAGE_PHOTO')`,
      [
        view.id,
        view.damageItems[k].id,
        `https://picsum.photos/seed/${sc.key}-${k}-${rand(3)}/480/360`,
      ],
    );
  }
  const customer = ctx.customers[SCENARIOS.indexOf(sc) % ctx.customers.length];
  await ctx.ds.query(
    `INSERT INTO incident_statements (incident_id, submitted_by_user_id, body) VALUES ($1,$2,$3)`,
    [
      view.id,
      customer.userId,
      'Khách hàng: Em phát hiện ngay cuối ca và đã chụp lại hiện trạng, mong CleanZ xử lý giúp.',
    ],
  );
  await ctx.ds.query(
    `INSERT INTO incident_statements (incident_id, submitted_by_user_id, body) VALUES ($1,$2,$3)`,
    [
      view.id,
      taskerUserId,
      'Tasker: Em có thao tác ở khu vực đó, mong được xem xét mức độ lỗi dựa trên bằng chứng.',
    ],
  );
}

const STAGES_AFTER_ACCEPT: Stage[] = [
  'REVIEWING',
  'DRAFTED',
  'SENT',
  'SENT_EXPIRED',
  'RESPONDED',
  'FINALIZED',
  'COMPENSATED',
];
const STAGES_WITH_DECISION: Stage[] = [
  'DRAFTED',
  'SENT',
  'SENT_EXPIRED',
  'RESPONDED',
  'FINALIZED',
  'COMPENSATED',
];
const STAGES_SENT: Stage[] = [
  'SENT',
  'SENT_EXPIRED',
  'RESPONDED',
  'FINALIZED',
  'COMPENSATED',
];

async function runScenario(ctx: Ctx, sc: Scenario): Promise<string> {
  const tasker = ctx.taskers[sc.tasker];
  const ticketId = await createTicket(ctx, sc, tasker.userId, tasker.taskerId);

  let view = await ctx.incidentAdmin.createFromTicket(ctx.adminId, ticketId, {
    title: sc.title,
    description: sc.description,
    damageItems: sc.items.map((it) => ({
      description: it.description,
      claimedAmount: it.claimed,
    })),
  });
  await addEvidenceAndStatements(ctx, sc, view, tasker.userId);

  if (!STAGES_AFTER_ACCEPT.includes(sc.stage))
    return view.incidentCode ?? view.id;
  view = await ctx.incidentAdmin.accept(ctx.adminId, view.id, {
    note: 'Seed: tiếp nhận thẩm định.',
  });

  if (!STAGES_WITH_DECISION.includes(sc.stage) || !sc.decision) {
    return view.incidentCode ?? view.id;
  }

  const d = sc.decision;
  const compensating = d.outcome === IncidentDecisionOutcome.COMPENSATE;
  view = await ctx.decision.saveDecision(ctx.adminId, view.id, {
    expectedDecisionVersion: view.decisionVersion,
    outcome: d.outcome,
    items: compensating
      ? view.damageItems.map((item, i) => ({
          damageItemId: item.id,
          approvedAmount: d.approved?.[i] ?? 0,
        }))
      : undefined,
    responsibilityParty: compensating ? d.party : undefined,
    responsibilityReason: compensating
      ? 'Seed: căn cứ ảnh hiện trạng và giải trình hai bên.'
      : undefined,
    taskerBorneAmount: compensating ? d.taskerBorne : undefined,
    platformBorneAmount: compensating ? d.platformBorne : undefined,
    allocationReason: compensating
      ? 'Seed: phân bổ theo mức độ lỗi đã ghi nhận.'
      : undefined,
    customerDecisionSummary:
      d.outcome === IncidentDecisionOutcome.REJECT
        ? 'CleanZ rất tiếc chưa đủ căn cứ để bồi thường cho yêu cầu này.'
        : 'CleanZ đã thẩm định và thông báo kết quả xử lý sự cố của quý khách.',
    internalDecisionNote: `Seed ${sc.key}: ${sc.note}`,
  });

  if (sc.stage === 'DRAFTED') return view.incidentCode ?? view.id;

  // Chỉ gửi phản biện khi Tasker thực sự phải chịu tiền — đúng luật due-process của
  // luồng mới: taskerBorne = 0 thì chốt thẳng, gọi send sẽ bị từ chối.
  const needsResponse = compensating && (d.taskerBorne ?? 0) > 0;
  if (STAGES_SENT.includes(sc.stage) && needsResponse) {
    view = await ctx.decision.sendToTasker(ctx.adminId, view.id, {
      expectedDecisionVersion: view.decisionVersion,
    });
  }

  if (sc.stage === 'RESPONDED') {
    await ctx.taskerService.upsertDecisionResponse(tasker.userId, view.id, {
      decisionVersion: view.decisionVersion,
      responseType: IncidentDecisionResponseType.DISAGREE,
      content:
        'Em không đồng ý mức này. Kệ đã lỏng ốc từ trước, em chỉ lau bụi phía trên chứ không tác động mạnh.',
    });
    return view.incidentCode ?? view.id;
  }

  // Hết hạn phản biện: lùi deadline để Admin chốt được ngay mà không phải chờ SLA thật.
  if (
    sc.stage === 'SENT_EXPIRED' ||
    sc.stage === 'FINALIZED' ||
    sc.stage === 'COMPENSATED'
  ) {
    await ctx.ds.query(
      `UPDATE incidents SET tasker_response_deadline = now() - interval '1 day'
        WHERE id = $1 AND tasker_response_deadline IS NOT NULL`,
      [view.id],
    );
  }
  if (sc.stage === 'SENT' || sc.stage === 'SENT_EXPIRED') {
    return view.incidentCode ?? view.id;
  }

  view = await ctx.decision.finalizeDecision(ctx.adminId, view.id, {
    expectedDecisionVersion: view.decisionVersion,
  });
  if (sc.stage === 'FINALIZED') return view.incidentCode ?? view.id;

  view = await ctx.compensation.execute(ctx.adminId, view.id);

  if (sc.ageDebtDays) {
    // Tuổi nợ tính trên chính sổ nợ, nên phải lùi ở đó chứ không lùi trên hồ sơ sự cố.
    await ctx.ds.query(
      `UPDATE tasker_debts SET created_at = now() - ($2 || ' days')::interval
        WHERE source = 'INCIDENT_COMPENSATION' AND source_ref_id = $1`,
      [view.id, String(sc.ageDebtDays)],
    );
  }
  return view.incidentCode ?? view.id;
}

/**
 * Xoá sạch bộ seed cũ để chạy lại từ đầu (RESET=1).
 *
 * LƯU Ý: chỉ xoá hồ sơ — các bút toán ví đã phát sinh (bồi thường S09–S11) KHÔNG được
 * hoàn nguyên, vì đảo một giao dịch đã ghi sổ là nghiệp vụ thật chứ không phải việc của
 * seed. Số dư ví Tasker sẽ được đặt lại đúng mức kịch bản ở bước nạp ví phía sau.
 */
async function resetSeed(
  ds: DataSource,
  wallets: WalletService,
): Promise<void> {
  const incidents = await ds.query<{ id: string; booking_id: string | null }[]>(
    `SELECT id, booking_id FROM incidents WHERE title LIKE $1`,
    [`${SEED_TAG}%`],
  );
  if (incidents.length === 0) return;
  const ids = incidents.map((i) => i.id);
  // Booking do chính seed tạo (mã kết thúc bằng mã kịch bản) nên xoá kèm là an toàn.
  const bookingIds = incidents
    .map((i) => i.booking_id)
    .filter((b): b is string => !!b);

  await ds.query(
    `DELETE FROM tasker_debts WHERE source='INCIDENT_COMPENSATION' AND source_ref_id = ANY($1)`,
    [ids],
  );
  // Outbox không có FK về incidents nên không đi theo CASCADE — bỏ quên là mỗi lần RESET
  // lại để rớt lại một nắm thông báo trỏ vào hồ sơ không còn tồn tại.
  await ds.query(
    `DELETE FROM notification_outbox WHERE ref_type='INCIDENT' AND ref_id::text = ANY($1)`,
    [ids],
  );
  await ds.query(
    `DELETE FROM customer_incident_strikes WHERE incident_id = ANY($1)`,
    [ids],
  );
  await ds.query(`DELETE FROM incidents WHERE id = ANY($1)`, [ids]);
  if (bookingIds.length > 0) {
    await ds.query(`DELETE FROM support_tickets WHERE booking_id = ANY($1)`, [
      bookingIds,
    ]);
    await ds.query(`DELETE FROM bookings WHERE id = ANY($1)`, [bookingIds]);
  }
  // Mỗi lần Admin tiếp nhận là ví Tasker bị HOLD; xoá hồ sơ mà bỏ quên khoản hold sẽ để
  // lại tiền treo vĩnh viễn, và lần seed sau nạp bù theo `balance` khiến tổng ví phình lên.
  await releaseSeedTaskerHolds(ds, wallets);
  console.log(
    `• RESET: đã xoá ${ids.length} sự cố seed cũ (kèm ticket/booking) và giải phóng hold treo.`,
  );
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const ds = app.get(DataSource);
    const wallets = app.get(WalletService);

    if (process.env.RESET === '1') await resetSeed(ds, wallets);

    if (process.env.FORCE !== '1') {
      const [existing] = await ds.query<{ n: number }[]>(
        `SELECT count(*)::int AS n FROM incidents WHERE title LIKE $1`,
        [`${SEED_TAG}%`],
      );
      if (existing.n > 0) {
        console.log(
          `⏭  Đã có ${existing.n} sự cố seed-state — bỏ qua. Đặt FORCE=1 để tạo thêm bộ mới.`,
        );
        return;
      }
    }

    const [admin] = await ds.query<{ id: string }[]>(
      `SELECT id FROM users WHERE role='ADMIN' ORDER BY created_at LIMIT 1`,
    );
    if (!admin) throw new Error('Không tìm thấy ADMIN trong users.');

    const [pkg] = await ds.query<{ id: string }[]>(
      `SELECT id FROM service_packages LIMIT 1`,
    );
    if (!pkg) throw new Error('Không có service_packages.');

    await fundSystemWallet(ds, wallets);
    const customers: { customerId: string; userId: string }[] = [];
    for (const p of CUSTOMER_PROFILES)
      customers.push(await ensureCustomer(ds, p));

    const taskers = {
      rich: await ensureTasker(ds, wallets, 'rich'),
      poor: await ensureTasker(ds, wallets, 'poor'),
      partial: await ensureTasker(ds, wallets, 'partial'),
      debt: await ensureTasker(ds, wallets, 'debt'),
    };

    const ctx: Ctx = {
      ds,
      adminId: admin.id,
      incidentAdmin: app.get(IncidentAdminService),
      decision: app.get(IncidentDecisionService),
      compensation: app.get(CompensationExecutorService),
      taskerService: app.get(IncidentTaskerService),
      taskers,
      customers,
      packageId: pkg.id,
    };

    console.log('');
    for (const sc of SCENARIOS) {
      const code = await runScenario(ctx, sc);
      console.log(`  ✓ ${sc.key}  ${code.padEnd(22)} ${sc.note}`);
    }

    const rows = await ds.query<{ status: string; n: number }[]>(
      `SELECT status, count(*)::int n FROM incidents WHERE title LIKE $1
        GROUP BY status ORDER BY status`,
      [`${SEED_TAG}%`],
    );
    console.log(
      `\n✅ Đã seed ${SCENARIOS.length} sự cố: ` +
        rows.map((r) => `${r.status}=${r.n}`).join(', '),
    );
    const debts = await ds.query<{ code: string; outstanding: string }[]>(
      `SELECT source_code AS code,
              (original_amount - recovered_amount - written_off_amount)::text AS outstanding
         FROM tasker_debts WHERE status='OUTSTANDING' ORDER BY created_at`,
    );
    if (debts.length > 0) {
      console.log(
        '   Nợ tồn đọng: ' +
          debts
            .map((d) => `${d.code}=${vnd(Number(d.outstanding))}`)
            .join(', '),
      );
    }
    console.log(
      `   Tài khoản test (mật khẩu ${PASSWORD}):\n` +
        `     Tasker : ${Object.values(TASKER_PROFILES)
          .map((p) => p.email)
          .join(' | ')}\n` +
        `     Khách  : ${CUSTOMER_PROFILES.map((p) => p.email).join(' | ')}`,
    );
  } finally {
    await app.close();
  }
}

main().catch((e: Error) => {
  console.error('Seed incident-states lỗi:', e?.message ?? e);
  process.exit(1);
});
