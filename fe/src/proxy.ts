import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

function getUserRole(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role; // e.g. "CUSTOMER", "TASKER", "ADMIN"
  } catch {
    return null;
  }
}

function parseCookieValue(setCookieHeader: string, name: string): string | null {
  if (!setCookieHeader.startsWith(`${name}=`)) return null;
  return setCookieHeader.split(";")[0].split("=").slice(1).join("=");
}

export async function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const accessToken = req.cookies.get("access_token")?.value;
  const refreshTokenCookie = req.cookies.get("refresh_token")?.value;

  if (!accessToken && !refreshTokenCookie) {
    return redirectToLogin(req, pathname, searchParams);
  }

  let activeToken = accessToken;

  // 1. Kiểm tra Token Expired và Refresh nếu cần
  if (!activeToken || isTokenExpired(activeToken)) {
    if (refreshTokenCookie) {
      try {
        const refreshRes = await fetch(`${baseURL}/auth/refresh`, {
          method: "POST",
          headers: {
            Cookie: `refreshToken=${refreshTokenCookie}`,
            "Content-Type": "application/json",
          },
        });

        if (refreshRes.ok) {
          const response = NextResponse.next();
          const setCookies = refreshRes.headers.getSetCookie();

          for (const sc of setCookies) {
            response.headers.append("Set-Cookie", sc);
            const atVal = parseCookieValue(sc, "access_token");
            if (atVal) {
              req.cookies.set("access_token", atVal);
              activeToken = atVal; // Cập nhật activeToken để check role phía dưới
            }
            const rtVal = parseCookieValue(sc, "refresh_token");
            if (rtVal) req.cookies.set("refresh_token", rtVal);
          }
        } else {
          return redirectToLogin(req, pathname, searchParams);
        }
      } catch {
        return redirectToLogin(req, pathname, searchParams);
      }
    } else {
      return redirectToLogin(req, pathname, searchParams);
    }
  }

  // 2. Kiểm tra quyền truy cập (Role-based access control)
  if (activeToken) {
    const role = getUserRole(activeToken);
    
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

  return redirectToLogin(req, pathname, searchParams);
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

export const config = {
  matcher: [
    "/admin/:path*",
    "/tasker/:path*",
    "/customer/:path*"
  ],
};
  