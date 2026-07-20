import { useEffect, useRef } from "react";
import { AdyenCheckout, Card, Dropin } from "@adyen/adyen-web";
import "@adyen/adyen-web/styles/adyen.css";

interface UseAdyenDropinParams {
  sessionId: string;
  sessionData: string;
  clientKey: string;
  /** "test" | "live" | ... — mặc định "test". */
  environment?: string;
  onCompleted: (payload: { sessionId: string; sessionResult: string }) => void;
  onError?: (message: string) => void;
}

/**
 * Mount Adyen Web Drop-in (Sessions flow) vào 1 container ref, tự unmount khi
 * effect cleanup (đóng dialog/đổi session) — tránh mount chồng nhiều instance.
 */
export function useAdyenDropin({
  sessionId,
  sessionData,
  clientKey,
  environment,
  onCompleted,
  onError,
}: UseAdyenDropinParams) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onCompletedRef = useRef(onCompleted);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onCompletedRef.current = onCompleted;
    onErrorRef.current = onError;
  }, [onCompleted, onError]);

  useEffect(() => {
    if (!sessionId || !sessionData || !clientKey) return;

    let dropin: Dropin | null = null;
    let cancelled = false;

    void (async () => {
      const checkout = await AdyenCheckout({
        environment: (environment ?? "test") as "test" | "live",
        clientKey,
        session: { id: sessionId, sessionData },
        onPaymentCompleted: (data) => {
          if ("sessionResult" in data) {
            onCompletedRef.current({
              sessionId,
              sessionResult: data.sessionResult,
            });
          }
        },
        onError: (error) => {
          onErrorRef.current?.(
            error.message || "Đã có lỗi xảy ra khi thanh toán",
          );
        },
      });

      if (cancelled || !containerRef.current) return;
      // Web Components v6 là tree-shakable — phải tự đăng ký từng payment
      // method component (ở đây chỉ dùng thẻ) qua paymentMethodComponents.
      dropin = new Dropin(checkout, { paymentMethodComponents: [Card] });
      dropin.mount(containerRef.current);
    })();

    return () => {
      cancelled = true;
      dropin?.unmount();
    };
  }, [sessionId, sessionData, clientKey, environment]);

  return containerRef;
}
