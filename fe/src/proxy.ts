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

  if (accessToken && !isTokenExpired(accessToken)) {
    return NextResponse.next();
  }

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

          const atVal = parseCookieValue(sc, "accessToken");
          if (atVal) req.cookies.set("accessToken", atVal);
          const rtVal = parseCookieValue(sc, "refreshToken");
          if (rtVal) req.cookies.set("refreshToken", rtVal);
        }

        return response;
      }
    } catch {
    }
  }

  return redirectToLogin(req, pathname, searchParams);
}

function redirectToLogin(req: NextRequest, pathname: string, searchParams: URLSearchParams) {
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname + (searchParams.toString() ? `?${searchParams}` : ""));
  loginUrl.searchParams.set("error", "unauthorized");
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // "/admin/:path*",
    "/worker/:path*",
    "/customer/:path*"
  ],
};
  
