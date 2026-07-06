"use client";

import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /**
   * Fallback hiển thị khi nhánh con ném lỗi. Có thể là ReactNode tĩnh, hoặc
   * hàm nhận `reset` để render nút "Thử lại" tự khôi phục mà không reload trang.
   */
  fallback?: React.ReactNode | ((reset: () => void) => React.ReactNode);
  /** Gọi khi bắt được lỗi — tiện log/telemetry. */
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Error boundary trong cây React (khác với `error.tsx` cấp segment của Next.js).
 * Dùng để cô lập các vùng dễ crash — như bản đồ WebGL (mapbox-gl) hay widget
 * chạy socket — để một lỗi cục bộ không làm trắng cả trang.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
    this.props.onError?.(error, info);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      const { fallback } = this.props;
      if (typeof fallback === "function") {
        return fallback(this.reset);
      }
      return fallback ?? null;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
