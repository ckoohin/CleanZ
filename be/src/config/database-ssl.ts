/**
 * Cấu hình TLS cho kết nối Postgres, dùng chung cho cả runtime (TypeOrmModule)
 * và CLI migration (`data-source.ts`) để hai đường không lệch nhau.
 *
 * Supabase và các Postgres quản lý khác **bắt buộc TLS**; kết nối không SSL bị
 * từ chối ngay ở bước handshake. Postgres chạy trong mạng nội bộ Docker thì
 * không cần, nên mặc định TẮT và bật bằng `DB_SSL=true`.
 *
 * `DB_SSL_CA` (nội dung PEM) dùng để xác thực danh tính server. Không có CA thì
 * đặt `rejectUnauthorized: false`: kết nối vẫn được mã hoá nhưng không chống
 * được tấn công người-đứng-giữa. Chấp nhận được khi DB nằm sau mạng riêng của
 * nhà cung cấp, nhưng nên nạp CA cho production.
 */
export interface PostgresSslOptions {
  rejectUnauthorized: boolean;
  ca?: string;
}

export function resolveDatabaseSsl(env: {
  DB_SSL?: string;
  DB_SSL_CA?: string;
}): PostgresSslOptions | false {
  const enabled = String(env.DB_SSL ?? '').toLowerCase();
  if (enabled !== 'true' && enabled !== '1') {
    return false;
  }

  const ca = env.DB_SSL_CA?.trim();
  if (ca) {
    // `\n` trong biến môi trường một dòng phải được khôi phục thành xuống dòng
    // thật, nếu không Node coi PEM là hỏng.
    return { rejectUnauthorized: true, ca: ca.replace(/\\n/g, '\n') };
  }

  return { rejectUnauthorized: false };
}
