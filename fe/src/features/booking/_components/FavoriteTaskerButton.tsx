"use client";

import React from "react";
import { Heart, Loader2 } from "lucide-react";
import {
  useAddFavoriteTasker,
  useFavoriteTaskers,
  useRemoveFavoriteTasker,
} from "@/features/customer/hooks/useFavoriteTasker";

interface FavoriteTaskerButtonProps {
  taskerId: string;
}

/**
 * Lưu/bỏ lưu thợ vào danh sách yêu thích ngay tại đơn vừa hoàn thành — đây là
 * lúc khách có đánh giá rõ ràng nhất về thợ. Thợ đã lưu sẽ được ưu tiên mời
 * riêng ở các đơn premium sau này.
 */
export const FavoriteTaskerButton: React.FC<FavoriteTaskerButtonProps> = ({
  taskerId,
}) => {
  const { data: favorites, isLoading } = useFavoriteTaskers();
  const addMutation = useAddFavoriteTasker();
  const removeMutation = useRemoveFavoriteTasker();

  const isFavorite = (favorites ?? []).some((f) => f.taskerId === taskerId);
  const isPending = addMutation.isPending || removeMutation.isPending;

  const handleClick = () => {
    if (isFavorite) {
      removeMutation.mutate(taskerId);
    } else {
      addMutation.mutate({ taskerId });
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading || isPending}
      className={`w-full py-3 font-bold text-xs rounded-2xl border active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 ${
        isFavorite
          ? "bg-rose-500/10 hover:bg-rose-500/15 text-rose-600 border-rose-500/25"
          : "bg-amber-500/5 hover:bg-amber-500/10 text-amber-600 border-amber-500/20"
      }`}
    >
      {isPending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Heart
          className={`w-3.5 h-3.5 ${isFavorite ? "fill-rose-500 text-rose-500" : ""}`}
        />
      )}
      {isFavorite
        ? "Đã lưu vào thợ yêu thích"
        : "Lưu thợ này để ưu tiên lần sau"}
    </button>
  );
};
