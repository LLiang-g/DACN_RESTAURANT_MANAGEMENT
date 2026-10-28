import { normalizeAdminDto } from "./adminDto";

const BASE_URL: string = import.meta.env.VITE_API_URL ?? "/api";
export const TOKEN_KEY = "admin_auth_user";

interface StoredAuth {
  token: string;
  username: string;
  role: string;
  accountType: string;
}

export function getStoredAuth(): StoredAuth | null {
  try {
    const value = JSON.parse(localStorage.getItem(TOKEN_KEY) ?? "null");
    return value && typeof value.token === "string" && value.token.split(".").length === 3
      && typeof value.username === "string" && value.role === "ADMIN" && value.accountType === "STAFF"
      ? value : null;
  } catch {
    return null;
  }
}

export function setStoredAuth(data: StoredAuth | null) {
  if (data) localStorage.setItem(TOKEN_KEY, JSON.stringify(data));
  else localStorage.removeItem(TOKEN_KEY);
}

export class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const isLogin = path === "/admin/auth/login";
  const auth = isLogin ? null : getStoredAuth();
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (auth?.token) headers.set("Authorization", `Bearer ${auth.token}`);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new Error("Không thể kết nối máy chủ. Vui lòng kiểm tra backend và thử lại.");
  }
  if (!res.ok) {
    let message = `Lỗi HTTP ${res.status}`;
    const body = await res.text();
    try {
      const error = JSON.parse(body);
      message = error.message || error.error || message;
    } catch {
      // Keep a concise error if a reverse proxy returns an HTML error page.
    }
    if (!isLogin && res.status === 401) {
      setStoredAuth(null);
      window.dispatchEvent(new Event("admin_auth_expired"));
    }
    throw new HttpError(res.status, message);
  }
  return res.status === 204 ? undefined as T : normalizeAdminDto(path, await res.json()) as T;
}
