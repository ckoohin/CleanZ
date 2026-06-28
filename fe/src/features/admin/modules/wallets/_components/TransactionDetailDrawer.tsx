"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  FileText,
  Link2,
  MapPin,
  PackageCheck,
  ReceiptText,
  type LucideIcon,
  UserRound,
  WalletCards,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type {
  WalletOwnerType,
  WalletTransaction,
  WalletTransactionType,
} from "../types/wallet.types";

interface Props {
  transaction: WalletTransaction | null;
  open: boolean;
  onClose: () => void;
}

const TRANSACTION_LABELS: Record<WalletTransactionType, string> = {
  DEPOSIT: "Nạp tiền",
  WITHDRAW: "Rút tiền",
  PAYMENT: "Thanh toán",
  REFUND: "Hoàn tiền",
  PLATFORM_FEE: "Phí nền tảng",
  TASKER_EARNING: "Thu nhập Tasker",
  DEPOSIT_HOLD: "Giữ tiền cọc",
  DEPOSIT_RELEASE: "Giải phóng tiền cọc",
  DEPOSIT_DEDUCT: "Khấu trừ tiền cọc",
  CANCELLATION_FEE: "Phí hủy",
  ADJUSTMENT: "Điều chỉnh",
};

const OWNER_LABELS: Record<WalletOwnerType, string> = {
  CUSTOMER: "Khách hàng",
  TASKER: "Tasker",
  SYSTEM: "Hệ thống",
};

const REFERENCE_LABELS: Record<string, string> = {
  BOOKING: "Booking",
  WITHDRAWAL_REQUEST: "Yêu cầu rút tiền",
  ADMIN_ADJUSTMENT: "Điều chỉnh bởi Admin",
  TASKER_TERMINATION: "Tasker nghỉ việc",
};

const formatCurrency = (value: number | string | null | undefined) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value));

export function TransactionDetailDrawer({ transaction, open, onClose }: Props) {
  if (!transaction) return null;

  const balanceBefore = Number(transaction.balanceBefore);
  const balanceAfter = Number(transaction.balanceAfter);
  const isCredit = balanceAfter >= balanceBefore;
  const AmountIcon = isCredit ? ArrowDownLeft : ArrowUpRight;
  const walletOwner = getWalletOwner(transaction);
  const reference = getReferenceInfo(transaction);
  const booking = transaction.booking;
  const bookingCustomer = booking?.customer?.user?.fullName;
  const bookingTasker = booking?.tasker?.user?.fullName;
  const bookingPackage = booking?.package?.name;
  const bookingSchedule = getBookingScheduleLabel(transaction);

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="cz-admin flex w-full flex-col bg-[var(--c-card)] p-0 sm:max-w-2xl">
        <SheetHeader className="border-b border-[var(--c-line)] px-6 py-5">
          <SheetTitle className="flex items-center gap-2 text-base text-[var(--c-ink)]">
            <ReceiptText className="size-5 text-[var(--c-primary-strong)]" />
            Chi tiết giao dịch
          </SheetTitle>
          <SheetDescription className="text-[var(--c-muted)]">
            {TRANSACTION_LABELS[transaction.type]} · {walletOwner.name}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-5 px-4 py-5 sm:p-6">
            <div
              className="rounded-[24px] p-5 text-white"
              style={{ background: isCredit ? "#0E9F6E" : "#E11D48" }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold opacity-80">
                  {TRANSACTION_LABELS[transaction.type]}
                </span>
                <AmountIcon className="size-5" />
              </div>
              <p className="mt-4 text-3xl font-black">
                {isCredit ? "+" : "-"}
                {formatCurrency(Math.abs(Number(transaction.amount)))}
              </p>
              <p className="mt-2 text-xs opacity-80">
                {new Date(transaction.createdAt).toLocaleString("vi-VN")}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoCard
                icon={WalletCards}
                label="Số dư trước"
                value={formatCurrency(transaction.balanceBefore)}
              />
              <InfoCard
                icon={WalletCards}
                label="Số dư sau"
                value={formatCurrency(transaction.balanceAfter)}
              />
            </div>

            <section className="space-y-3 rounded-2xl border border-[var(--c-line)] bg-[var(--c-card)] p-4">
              <h3 className="text-sm font-bold text-[var(--c-ink)]">Thông tin tham chiếu</h3>
              <DetailRow
                icon={Link2}
                label="Nguồn giao dịch"
                value={
                  transaction.referenceType
                    ? (REFERENCE_LABELS[transaction.referenceType] ??
                      transaction.referenceType)
                    : "Không có"
                }
              />
              <DetailRow
                icon={ReceiptText}
                label={reference.label}
                value={reference.value}
              />
              <DetailRow
                icon={UserRound}
                label="Chủ ví"
                value={walletOwner.detail}
              />
              {bookingCustomer && (
                <DetailRow
                  icon={UserRound}
                  label="Khách hàng"
                  value={bookingCustomer}
                />
              )}
              {bookingTasker && (
                <DetailRow
                  icon={UserRound}
                  label="Tasker"
                  value={bookingTasker}
                />
              )}
              {bookingPackage && (
                <DetailRow
                  icon={PackageCheck}
                  label="Gói dịch vụ"
                  value={bookingPackage}
                />
              )}
              {bookingSchedule && (
                <DetailRow
                  icon={CalendarClock}
                  label="Lịch làm việc"
                  value={bookingSchedule}
                />
              )}
              {booking?.address && (
                <DetailRow
                  icon={MapPin}
                  label="Địa chỉ"
                  value={booking.address}
                />
              )}
              {booking?.totalPrice != null && (
                <DetailRow
                  icon={WalletCards}
                  label="Tổng tiền booking"
                  value={formatCurrency(booking.totalPrice)}
                />
              )}
            </section>

            <section className="space-y-3 rounded-2xl border border-[var(--c-line)] bg-[var(--c-card)] p-4">
              <h3 className="text-sm font-bold text-[var(--c-ink)]">Nội dung ghi nhận</h3>
              <DetailRow
                icon={FileText}
                label="Mô tả"
                value={transaction.description || "Không có mô tả"}
              />
              <DetailRow
                icon={CalendarClock}
                label="Thời gian"
                value={new Date(transaction.createdAt).toLocaleString("vi-VN")}
              />
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function getWalletOwner(transaction: WalletTransaction): {
  name: string;
  detail: string;
} {
  const wallet = transaction.wallet;
  if (!wallet) {
    return { name: "Không xác định", detail: "Không xác định được ví" };
  }

  if (wallet.ownerType === "SYSTEM") {
    return { name: "Ví hệ thống", detail: "Ví hệ thống CleanZ" };
  }

  const profile =
    wallet.ownerType === "TASKER" ? wallet.tasker : wallet.customer;
  const ownerType = OWNER_LABELS[wallet.ownerType];
  const fullName = profile?.user?.fullName;
  const email = profile?.user?.email;

  if (!fullName) {
    return { name: ownerType, detail: ownerType };
  }

  return {
    name: fullName,
    detail: email
      ? `${ownerType}: ${fullName} · ${email}`
      : `${ownerType}: ${fullName}`,
  };
}

function getReferenceInfo(transaction: WalletTransaction): {
  label: string;
  value: string;
} {
  switch (transaction.referenceType) {
    case "BOOKING":
      return {
        label: "Booking liên quan",
        value:
          transaction.booking?.bookingCode
            ? `Đơn ${transaction.booking.bookingCode}`
            : "Booking phát sinh giao dịch này",
      };
    case "WITHDRAWAL_REQUEST":
      return {
        label: "Yêu cầu liên quan",
        value: transaction.description || "Yêu cầu rút tiền",
      };
    case "ADMIN_ADJUSTMENT": {
      const actor = transaction.description?.match(
        /Điều chỉnh bởi Admin:\s*(.+)$/,
      )?.[1];
      return {
        label: "Người điều chỉnh",
        value: actor || "Admin hệ thống",
      };
    }
    case "TASKER_TERMINATION":
      return {
        label: "Nghiệp vụ liên quan",
        value: "Hoàn ký quỹ khi Tasker nghỉ việc",
      };
    default:
      return {
        label: "Đối tượng liên quan",
        value: transaction.description || "Giao dịch nội bộ hệ thống",
      };
  }
}

function getBookingScheduleLabel(transaction: WalletTransaction): string | null {
  const booking = transaction.booking;
  if (!booking) return null;

  if (booking.scheduledStart) {
    const start = new Date(booking.scheduledStart);
    const date = Number.isNaN(start.getTime())
      ? null
      : start.toLocaleString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
    return [
      date,
      booking.durationHours ? `${booking.durationHours} giờ` : null,
    ]
      .filter(Boolean)
      .join(" · ") || null;
  }

  const date = booking.scheduledStartDate
    ? new Date(booking.scheduledStartDate).toLocaleDateString("vi-VN")
    : null;
  const time = booking.scheduledStartTime?.slice(0, 5) ?? null;

  return [
    [date, time].filter(Boolean).join(" "),
    booking.durationHours ? `${booking.durationHours} giờ` : null,
  ]
    .filter(Boolean)
    .join(" · ") || null;
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--c-line)] bg-[var(--c-card)] p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-[var(--c-muted)]">
        <Icon className="size-4 text-[var(--c-primary-strong)]" />
        {label}
      </div>
      <p className="mt-2 text-sm font-bold text-[var(--c-ink)]">{value}</p>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-[var(--c-line)] pb-3 last:border-0 last:pb-0">
      <Icon className="mt-0.5 size-4 shrink-0 text-[var(--c-primary-strong)]" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[var(--c-muted)]">{label}</p>
        <p
          className={`mt-1 break-words text-sm font-semibold text-[var(--c-ink)] ${
            mono ? "font-mono text-xs" : ""
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
