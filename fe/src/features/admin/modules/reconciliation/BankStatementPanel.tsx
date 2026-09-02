"use client";

import React, { useRef, useState } from "react";
import { AdminButton } from "@/components/admin";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Landmark, EyeOff, Search } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  useBankStatementEntries,
  useIgnoreBankEntry,
  useImportBankStatement,
  type BankStatementImportResult,
  type BankStatementStatus,
} from "./bank-statement";

const fmtVnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`;
const dt = (s: string) => new Date(s).toLocaleString("vi-VN");

const STATUS_TABS: { value: BankStatementStatus; label: string }[] = [
  { value: "UNMATCHED", label: "Chưa đối chiếu" },
  { value: "MATCHED", label: "Đã đối chiếu" },
  { value: "IGNORED", label: "Đã bỏ qua" },
];

/** Trần dung lượng file đọc ở client — khớp với trần ký tự BE nhận trong một lần import. */
const MAX_FILE_BYTES = 2 * 1024 * 1024;

/**
 * Nhập sao kê ngân hàng và triage các dòng chưa đối chiếu.
 *
 * Việc GẮN một dòng vào sự cố cố ý KHÔNG nằm ở đây mà ở trong chi tiết sự cố: ở đó mới có
 * đủ ngữ cảnh (số đã duyệt, số đã khai, ảnh minh chứng) để biết dòng tiền này có đúng là
 * khoản đó không. Ở màn này, người ta chỉ nhìn thấy một dãy số.
 */
export function BankStatementPanel() {
  const [status, setStatus] = useState<BankStatementStatus>("UNMATCHED");
  const [keyword, setKeyword] = useState("");
  const [ignoringId, setIgnoringId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [lastImport, setLastImport] =
    useState<BankStatementImportResult | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const entries = useBankStatementEntries({ status, keyword: keyword.trim() });
  const importCsv = useImportBankStatement();
  const ignore = useIgnoreBankEntry();

  const pickFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) {
      toast.error("File sao kê vượt 2MB — hãy tách theo từng kỳ nhỏ hơn.");
      return;
    }
    const csv = await f.text();
    importCsv.mutate(csv, { onSuccess: (r) => setLastImport(r) });
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--c-ink)]">
          <Landmark className="size-4" /> Sao kê ngân hàng
        </h2>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            void pickFile(f);
          }}
        />
        <AdminButton
          size="sm"
          variant="secondary"
          className="rounded-lg gap-1.5"
          disabled={importCsv.isPending}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="size-3.5" />
          {importCsv.isPending ? "Đang nhập..." : "Nhập file CSV"}
        </AdminButton>
      </div>

      <p className="text-xs text-[var(--c-muted)]">
        Khoản bồi thường chi trả thủ công rời tài khoản ngân hàng mà không có
        bút toán ví nào. Nhập sao kê vào đây để đối chiếu — đây là nguồn dữ liệu
        duy nhất không đến từ thao tác của admin. Cột bắt buộc:{" "}
        <b>mã giao dịch</b>, <b>ngày giao dịch</b>, <b>số tiền</b>; tuỳ chọn:
        chiều tiền, tài khoản/tên đối ứng, nội dung. Nhập lại cùng một file là
        an toàn — dòng trùng mã giao dịch sẽ được bỏ qua.
      </p>

      {lastImport && (
        <div className="space-y-1 rounded-xl border border-[var(--c-line)] bg-[var(--c-card)] p-3 text-[11px]">
          <p className="text-[var(--c-ink)]">
            Đọc <b>{lastImport.parsed}</b> dòng · thêm mới{" "}
            <b>{lastImport.inserted}</b> · đã có sẵn{" "}
            <b>{lastImport.duplicated}</b>
          </p>
          {lastImport.errors.length > 0 && (
            <div className="space-y-0.5 text-[#B45309]">
              <p className="font-semibold">
                {lastImport.errors.length} dòng không đọc được (các dòng khác
                vẫn được nhập):
              </p>
              {lastImport.errors.slice(0, 10).map((e) => (
                <p key={`${e.line}-${e.message}`}>
                  Dòng {e.line}: {e.message}
                </p>
              ))}
              {lastImport.errors.length > 10 && <p>…</p>}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setStatus(t.value)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                status === t.value
                  ? "bg-[var(--c-primary)]/15 text-[var(--c-primary-strong)]"
                  : "text-[var(--c-muted)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-[var(--c-muted)]" />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo mã GD, nội dung, tên/số tài khoản"
            className="h-8 rounded-lg pl-7 text-sm"
          />
        </div>
      </div>

      {entries.isLoading ? (
        <p className="py-6 text-center text-sm text-[var(--c-muted)]">
          Đang tải...
        </p>
      ) : (entries.data?.length ?? 0) === 0 ? (
        <p className="rounded-xl border border-[var(--c-line)] bg-[var(--c-card)] p-4 text-center text-xs text-[var(--c-muted)]">
          Không có dòng sao kê nào ở mục này.
        </p>
      ) : (
        <div className="space-y-2">
          {entries.data?.map((e) => (
            <div
              key={e.id}
              className="space-y-1.5 rounded-xl border border-[var(--c-line)] bg-[var(--c-card)] p-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[var(--c-ink)]">
                    {e.bankRef}
                    <span className="ml-2 text-[11px] font-normal text-[var(--c-muted)]">
                      {dt(e.txnAt)}
                      {e.counterpartyName ? ` · ${e.counterpartyName}` : ""}
                      {e.counterpartyAccount
                        ? ` · ${e.counterpartyAccount}`
                        : ""}
                    </span>
                  </p>
                  {e.description && (
                    <p className="text-[11px] text-[var(--c-muted)]">
                      {e.description}
                    </p>
                  )}
                  {e.matchedIncident && (
                    <p className="text-[11px] text-[#047857]">
                      Đã đối chiếu với sự cố{" "}
                      {e.matchedIncident.incidentCode ?? e.matchedIncident.id}
                    </p>
                  )}
                  {e.note && (
                    <p className="text-[11px] text-[var(--c-muted)]">
                      Ghi chú: {e.note}
                    </p>
                  )}
                </div>
                <b
                  className={
                    e.direction === "DEBIT"
                      ? "text-[#DC2626]"
                      : "text-[#047857]"
                  }
                >
                  {e.direction === "DEBIT" ? "−" : "+"}
                  {fmtVnd(e.amount)}
                </b>
              </div>

              {e.status === "UNMATCHED" &&
                (ignoringId === e.id ? (
                  <div className="space-y-1.5">
                    <Textarea
                      value={reason}
                      maxLength={1000}
                      rows={2}
                      onChange={(ev) => setReason(ev.target.value)}
                      placeholder="Vì sao dòng này không liên quan bồi thường? (tối thiểu 10 ký tự)"
                      className="resize-none rounded-lg text-sm"
                    />
                    <div className="flex gap-1.5">
                      <AdminButton
                        size="sm"
                        variant="secondary"
                        className="rounded-lg"
                        disabled={reason.trim().length < 10 || ignore.isPending}
                        onClick={() =>
                          ignore.mutate(
                            { entryId: e.id, reason: reason.trim() },
                            {
                              onSuccess: () => {
                                setIgnoringId(null);
                                setReason("");
                              },
                            },
                          )
                        }
                      >
                        Xác nhận bỏ qua
                      </AdminButton>
                      <AdminButton
                        size="sm"
                        variant="ghost"
                        className="rounded-lg"
                        onClick={() => setIgnoringId(null)}
                      >
                        Huỷ
                      </AdminButton>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <AdminButton
                      size="sm"
                      variant="ghost"
                      className="rounded-lg gap-1.5"
                      onClick={() => {
                        setIgnoringId(e.id);
                        setReason("");
                      }}
                    >
                      <EyeOff className="size-3.5" /> Không liên quan bồi thường
                    </AdminButton>
                    <span className="text-[11px] text-[var(--c-muted)]">
                      Để gắn dòng này vào một khoản chi, mở chi tiết sự cố tương
                      ứng — ở đó có đủ số liệu để đối chiếu.
                    </span>
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
