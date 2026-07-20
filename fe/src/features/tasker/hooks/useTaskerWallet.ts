import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/features/auth/hooks/auth.hooks";
import { taskerWalletApi } from "../services/tasker-wallet.service";
import type {
  CreateTaskerWithdrawalPayload,
  CreateTaskerTopupPayload,
  TaskerEarningsPeriod,
  TaskerWalletTransactionQuery,
} from "../types/tasker-wallet.types";

export const taskerWalletKeys = {
  all: ["tasker-wallet"] as const,
  detail: () => [...taskerWalletKeys.all, "detail"] as const,
  transactions: (query?: TaskerWalletTransactionQuery) =>
    [...taskerWalletKeys.all, "transactions", query] as const,
  depositTransactions: () =>
    [...taskerWalletKeys.all, "deposit-transactions"] as const,
  earningsSummary: () => [...taskerWalletKeys.all, "earnings-summary"] as const,
  earningsBreakdown: (period: TaskerEarningsPeriod, anchor?: string) =>
    [...taskerWalletKeys.all, "earnings-breakdown", period, anchor] as const,
  topupConfig: () => [...taskerWalletKeys.all, "topup-config"] as const,
  cards: () => [...taskerWalletKeys.all, "cards"] as const,
};

export function useTaskerWallet() {
  return useQuery({
    queryKey: taskerWalletKeys.detail(),
    queryFn: taskerWalletApi.getWallet,
  });
}

export function useTaskerEarningsSummary() {
  return useQuery({
    queryKey: taskerWalletKeys.earningsSummary(),
    queryFn: taskerWalletApi.getEarningsSummary,
  });
}

export function useTaskerEarningsBreakdown(
  period: TaskerEarningsPeriod,
  anchor?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: taskerWalletKeys.earningsBreakdown(period, anchor),
    queryFn: () => taskerWalletApi.getEarningsBreakdown(period, anchor),
    enabled,
  });
}

export function useTaskerTopupConfig(enabled = true) {
  return useQuery({
    queryKey: taskerWalletKeys.topupConfig(),
    queryFn: taskerWalletApi.getTopupConfig,
    enabled,
  });
}

export function useTaskerWalletTransactions(
  query?: TaskerWalletTransactionQuery,
  enabled = true,
) {
  return useQuery({
    queryKey: taskerWalletKeys.transactions(query),
    queryFn: () => taskerWalletApi.getTransactions(query),
    enabled,
  });
}

export function useTaskerDepositTransactions(enabled = true) {
  return useQuery({
    queryKey: taskerWalletKeys.depositTransactions(),
    queryFn: taskerWalletApi.getDepositTransactions,
    enabled,
  });
}

export function useCreateTaskerWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTaskerWithdrawalPayload) =>
      taskerWalletApi.createWithdrawal(payload),
    onSuccess: () => {
      toast.success("Đã gửi yêu cầu rút tiền");
      queryClient.invalidateQueries({ queryKey: taskerWalletKeys.all });
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

export function useCreateTaskerTopup() {
  return useMutation({
    mutationFn: (payload: CreateTaskerTopupPayload) =>
      taskerWalletApi.createTopup(payload),
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

export function useCaptureTaskerTopup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (topupId: string) => taskerWalletApi.captureTopup(topupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskerWalletKeys.all });
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

/* ─── Nạp tiền Adyen (Web Drop-in) — luồng giống customer, endpoint tasker ─── */

export function useTaskerCards(enabled = true) {
  return useQuery({
    queryKey: taskerWalletKeys.cards(),
    queryFn: taskerWalletApi.listCards,
    enabled,
  });
}

export function useRemoveTaskerCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cardId: string) => taskerWalletApi.removeCard(cardId),
    onSuccess: () => {
      toast.success("Đã xóa thẻ đã lưu");
      queryClient.invalidateQueries({ queryKey: taskerWalletKeys.cards() });
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}

export function useConfirmTaskerAdyenTopup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { sessionId: string; sessionResult: string }) =>
      taskerWalletApi.confirmAdyenTopup(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskerWalletKeys.all });
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error)),
  });
}
