import { getToken } from '../auth/tokenStorage';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

let onUnauthorized: (() => void) | null = null;

/** AuthContext đăng ký hàm này để tự đăng xuất khi token hết hạn. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** false: không gắn token (dùng cho đăng nhập) */
  auth?: boolean;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = auth ? getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Không kết nối được máy chủ');
  }

  // Token hết hạn/không hợp lệ: Spring Security trả 401 hoặc 403 (không có nội dung)
  if (auth && (res.status === 401 || res.status === 403)) {
    onUnauthorized?.();
    throw new ApiError(res.status, 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
  }

  if (!res.ok) {
    let message = `Đã có lỗi xảy ra (mã ${res.status})`; // kèm mã lỗi để dễ tìm nguyên nhân
    try {
      const err = await res.json(); // ErrorResponse { code, message } của backend
      if (err?.message) message = err.message;
    } catch {
      /* phản hồi không phải JSON, giữ thông báo mặc định */
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Đã có lỗi xảy ra';
}
