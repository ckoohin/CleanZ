const DEFAULT_API_URL = "http://localhost:5000/api/v1";

function isLocalDevelopmentHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  );
}

/**
 * Trong development, FE có thể được mở bằng localhost trên máy tính hoặc IP LAN
 * trên điện thoại. API phải dùng cùng hostname để cookie SameSite=Lax được gửi.
 */
export function getApiBaseUrl(currentHostname?: string): string {
  const configuredUrl =
    process.env.NEXT_PUBLIC_API_URL?.trim() || DEFAULT_API_URL;

  if (process.env.NODE_ENV === "production") {
    return configuredUrl.replace(/\/$/, "");
  }

  const browserHostname =
    currentHostname ??
    (typeof window !== "undefined" ? window.location.hostname : undefined);

  if (!browserHostname) {
    return configuredUrl.replace(/\/$/, "");
  }

  try {
    const url = new URL(configuredUrl);
    // Chỉ thay hostname với cấu hình localhost/LAN. Domain HTTPS công khai
    // (ví dụ api.luuhanh.info) phải được giữ nguyên cả khi chạy next dev.
    if (isLocalDevelopmentHost(url.hostname)) {
      url.hostname = browserHostname;
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return configuredUrl.replace(/\/$/, "");
  }
}

export function getBackendOrigin(currentHostname?: string): string {
  return getApiBaseUrl(currentHostname).replace(/\/api\/v1\/?$/, "");
}
