import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function decodeTokenPayload(token: string): Record<string, unknown> | null {
  try {
    const encodedPayload = token.split(".")[1];
    if (!encodedPayload) return null;

    const normalized = encodedPayload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(encodedPayload.length / 4) * 4, "=");

    return JSON.parse(atob(normalized)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeTokenPayload(token);
  const expiresAt = Number(payload?.exp);
  return !Number.isFinite(expiresAt) || expiresAt * 1000 <= Date.now();
}

function getUserRole(token: string): string | null {
  const payload = decodeTokenPayload(token);
  return typeof payload?.role === "string" ? payload.role : null;
}

export function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const accessToken = req.cookies.get("access_token")?.value;
  const refreshTokenCookie = req.cookies.get("refresh_token")?.value;

  if (!accessToken && !refreshTokenCookie) {
    return redirectToLogin(req, pathname, searchParams);
  }

  // Chỉ Axios interceptor được phép xoay refresh token. Nếu proxy cũng refresh,
  // nhiều request điều hướng song song có thể cùng dùng một token cũ và tự làm
  // mất hiệu lực lẫn nhau. Khi access token hết hạn nhưng còn refresh token,
  // cho request đi tiếp để RoleGuard gọi /auth/me và interceptor refresh một lần.
  if (!accessToken || isTokenExpired(accessToken)) {
    return refreshTokenCookie
      ? NextResponse.next()
      : redirectToLogin(req, pathname, searchParams);
  }

  // Kiểm tra nhanh role khi access token còn hạn. BE vẫn là lớp phân quyền chính.
  const role = getUserRole(accessToken);
    
  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return redirectToLogin(req, pathname, searchParams);
  }
    
  if (pathname.startsWith("/tasker") && role !== "TASKER" && role !== "ADMIN") {
    return redirectToLogin(req, pathname, searchParams);
  }
    
  if (pathname.startsWith("/customer") && role !== "CUSTOMER" && role !== "ADMIN") {
    return redirectToLogin(req, pathname, searchParams);
  }

  return NextResponse.next();
}

function redirectToLogin(req: NextRequest, pathname: string, searchParams: URLSearchParams) {
  const loginUrl = req.nextUrl.clone();
  
  if (pathname.startsWith("/admin")) {
    loginUrl.pathname = "/login-admin";
  } else if (pathname.startsWith("/tasker")) {
    loginUrl.pathname = "/login-tasker";
  } else {
    loginUrl.pathname = "/login"; // Mặc định cho customer hoặc các trang khác
  }

  loginUrl.searchParams.set("next", pathname + (searchParams.toString() ? `?${searchParams}` : ""));
  loginUrl.searchParams.set("error", "unauthorized");
  return NextResponse.redirect(loginUrl);
}

// Next.js 16: file đặc biệt tên `proxy.ts`, export function `proxy` + `config`.
// (Đây là tên mới của "middleware" cũ — KHÔNG tạo thêm src/middleware.ts.)
export const config = {
  matcher: [
    "/admin/:path*",
    "/tasker/:path*",
    "/customer/:path*",
  ],
};

