import { useState, useEffect, useCallback } from "react";

/**
 * Persist state vào localStorage — tự động sync khi tab khác thay đổi.
 * Serialize/deserialize bằng JSON.
 *
 * @param key  - localStorage key (nên dùng prefix rõ ràng, vd "admin:filter:earnings")
 * @param initialValue - giá trị mặc định nếu key chưa tồn tại
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const readValue = useCallback((): T => {
    if (typeof window === "undefined") return initialValue;
    try {
      const raw = window.localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initialValue;
    } catch {
      return initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const next =
          typeof value === "function"
            ? (value as (prev: T) => T)(storedValue)
            : value;
        window.localStorage.setItem(key, JSON.stringify(next));
        setStoredValue(next);
        // Cho phép các component khác cùng key tự sync
        window.dispatchEvent(new Event("local-storage"));
      } catch {
        // Lỗi QuotaExceeded hoặc private mode — không làm gì thêm
      }
    },
    [key, storedValue],
  );

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
      window.dispatchEvent(new Event("local-storage"));
    } catch {
      // ignore
    }
  }, [key, initialValue]);

  // Sync khi tab khác (hoặc component khác) thay đổi cùng key
  useEffect(() => {
    const handler = () => setStoredValue(readValue());
    window.addEventListener("storage", handler);
    window.addEventListener("local-storage", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("local-storage", handler);
    };
  }, [readValue]);

  return [storedValue, setValue, removeValue] as const;
}
