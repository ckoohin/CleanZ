import { cookies } from "next/headers";
import axios from "axios";
import type { User } from "@/features/auth/types/auth.type";

const baseURL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1";

export async function getMeServer(): Promise<User | null> {
  const cookieStore = await cookies();

  let cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  try {
    const res = await axios.get<User>(`${baseURL}/auth/me`, {
      headers: { Cookie: cookieHeader },
      withCredentials: true,
    });

    return res.data;
  } catch (err: any) {
    if (err.response?.status !== 401) return null;

    try {
      // refresh token
      const refreshRes = await axios.post(
        `${baseURL}/auth/refresh`,
        {},
        {
          headers: { Cookie: cookieHeader },
          withCredentials: true,
        }
      );

      // lấy cookie mới từ backend
      const setCookie = refreshRes.headers["set-cookie"];

      if (setCookie) {
        cookieHeader = setCookie.join("; ");
      }

      // gọi lại auth/me với cookie mới
      const meRes = await axios.get<User>(`${baseURL}/auth/me`, {
        headers: { Cookie: cookieHeader },
        withCredentials: true,
      });

      return meRes.data;
    } catch {
      return null;
    }
  }
}