import { DataSource } from 'typeorm';

/**
 * Bất biến tiền của hệ thống ví — dạng CHẠY ĐƯỢC.
 *
 * "Bảo toàn tổng tiền" trước đây chỉ là câu văn trong comment của từng service, nên mỗi
 * luồng tiền tự kiểm theo cách riêng và luồng nào không có test thì không ai kiểm. File
 * này biến nó thành assertion dùng chung cho mọi luồng.
 *
 * ĐỊNH NGHĨA. Tổng tài sản nền tảng đang giữ = `SUM(balance + hold_balance)` trên TẤT CẢ
 * ví. Phải dùng cả hai cột: `hold_balance` vẫn là tiền trong hệ thống, chỉ là đã bị khoá.
 * Nếu chỉ nhìn `balance` thì một thao tác giữ tiền (hold) trông y như tiền bốc hơi.
 *
 * Tổng này CHỈ đổi khi tiền thật sự đi qua biên hệ thống:
 *   • vào  — nạp ví qua PayOS
 *   • ra   — rút tiền về ngân hàng
 * Mọi thứ khác (hoàn bồi thường, thu hoa hồng, giữ/giải phóng, thu hồi nợ) chỉ là chuyển
 * tiền giữa các ví ⇒ tổng phải KHÔNG đổi.
 *
 * Chi trả bồi thường THỦ CÔNG là ngoại lệ có chủ ý: tiền đi từ tài khoản ngân hàng công
 * ty, không qua ví nào — nên tổng ví cũng không đổi, khoản đó nằm ở sổ chi ngoài
 * (`incidents.external_payout_amount`).
 */

export interface MoneyBoundaryFlow {
  /** Tiền từ ngoài VÀO hệ thống ví (nạp PayOS…). Mặc định 0. */
  externalIn?: number;
  /** Tiền RỜI hệ thống ví ra ngoài (chi rút tiền…). Mặc định 0. */
  externalOut?: number;
}

interface WalletRow {
  id: string;
  owner_type: string;
  balance: string;
  hold_balance: string;
}

interface Snapshot {
  total: number;
  byWallet: Map<string, { label: string; balance: number; hold: number }>;
  txIds: Set<string>;
}

async function snapshot(ds: DataSource): Promise<Snapshot> {
  const wallets: WalletRow[] = await ds.query(
    `SELECT id, owner_type, balance, hold_balance FROM wallets`,
  );
  const txs: { id: string }[] = await ds.query(
    `SELECT id FROM wallet_transactions`,
  );

  const byWallet = new Map<
    string,
    { label: string; balance: number; hold: number }
  >();
  let total = 0;
  for (const w of wallets) {
    const balance = Number(w.balance);
    const hold = Number(w.hold_balance);
    byWallet.set(w.id, { label: w.owner_type, balance, hold });
    total += balance + hold;
  }
  return { total, byWallet, txIds: new Set(txs.map((t) => t.id)) };
}

function describeDiff(before: Snapshot, after: Snapshot): string {
  const lines: string[] = [];
  for (const [id, a] of after.byWallet) {
    const b = before.byWallet.get(id) ?? {
      label: a.label,
      balance: 0,
      hold: 0,
    };
    const dBalance = a.balance - b.balance;
    const dHold = a.hold - b.hold;
    if (dBalance === 0 && dHold === 0) continue;
    lines.push(
      `  ${a.label.padEnd(8)} balance ${dBalance >= 0 ? '+' : ''}${dBalance}` +
        `, hold ${dHold >= 0 ? '+' : ''}${dHold}`,
    );
  }
  return lines.length ? lines.join('\n') : '  (không ví nào đổi)';
}

/**
 * Chạy `run()` rồi khẳng định tổng tiền trong hệ thống ví chỉ đổi đúng bằng dòng tiền
 * qua biên đã khai báo. Trả về nguyên kết quả của `run()` để dùng tiếp.
 *
 * Kèm hai kiểm tra đi cùng, vì chúng chỉ có ý nghĩa trong đúng cửa sổ thao tác này:
 *  1. Không ví nào âm (`balance`/`hold_balance` < 0).
 *  2. Mọi thay đổi `balance` đều có bút toán tương ứng — chặn việc sửa số dư mà quên
 *     ghi sổ (số liệu vẫn "đúng" nhưng lịch sử giao dịch mất dấu).
 */
export async function expectMoneyConserved<T>(
  ds: DataSource,
  run: () => Promise<T>,
  expected: MoneyBoundaryFlow = {},
): Promise<T> {
  const before = await snapshot(ds);
  const result = await run();
  const after = await snapshot(ds);

  const expectedDelta =
    (expected.externalIn ?? 0) - (expected.externalOut ?? 0);
  const actualDelta = after.total - before.total;

  if (Math.abs(actualDelta - expectedDelta) > 0.01) {
    throw new Error(
      `Vi phạm bảo toàn tiền: tổng ví đổi ${actualDelta}, kỳ vọng ${expectedDelta}.\n` +
        `Biến động từng ví:\n${describeDiff(before, after)}`,
    );
  }

  for (const [, w] of after.byWallet) {
    if (w.balance < 0 || w.hold < 0) {
      throw new Error(
        `Ví ${w.label} bị âm: balance=${w.balance}, hold=${w.hold}`,
      );
    }
  }

  await assertLedgerMatchesBalances(ds, before, after);
  return result;
}

/**
 * Với mỗi ví: tổng tác động có dấu của các bút toán MỚI phải bằng đúng thay đổi
 * `balance`. (Bút toán hold/capture cố ý không đổi `balance` nên đóng góp 0 — phần tiền
 * đó nằm ở `hold_balance` và đã được bao trong kiểm tra bảo toàn tổng ở trên.)
 */
async function assertLedgerMatchesBalances(
  ds: DataSource,
  before: Snapshot,
  after: Snapshot,
): Promise<void> {
  const rows: { wallet_id: string; delta: string }[] = await ds.query(
    `SELECT wallet_id, SUM(balance_after - balance_before) AS delta
       FROM wallet_transactions
      GROUP BY wallet_id`,
  );
  const oldRows: { wallet_id: string; delta: string }[] = before.txIds.size
    ? await ds.query(
        `SELECT wallet_id, SUM(balance_after - balance_before) AS delta
           FROM wallet_transactions
          WHERE id = ANY($1)
          GROUP BY wallet_id`,
        [[...before.txIds]],
      )
    : [];

  const nowByWallet = new Map(rows.map((r) => [r.wallet_id, Number(r.delta)]));
  const oldByWallet = new Map(
    oldRows.map((r) => [r.wallet_id, Number(r.delta)]),
  );

  // Duyệt theo VÍ chứ không theo sổ: ví chưa có bút toán nào cũng phải được kiểm, nếu
  // không thì đúng trường hợp "sửa số dư mà không ghi sổ" lại lọt lưới.
  for (const [walletId, a] of after.byWallet) {
    const newLedgerDelta =
      (nowByWallet.get(walletId) ?? 0) - (oldByWallet.get(walletId) ?? 0);
    const balanceDelta =
      a.balance - (before.byWallet.get(walletId)?.balance ?? 0);
    if (Math.abs(newLedgerDelta - balanceDelta) > 0.01) {
      throw new Error(
        `Ví ${a.label}: số dư đổi ${balanceDelta} nhưng bút toán chỉ ghi ${newLedgerDelta}` +
          ' — có thay đổi số dư không được ghi sổ.',
      );
    }
  }
}
