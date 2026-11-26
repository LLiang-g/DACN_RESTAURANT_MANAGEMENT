import type { Session } from '../types';
import { ApiError, request } from './httpClient';

interface LoginResponse {
  token: string;
  accountType: string;
  role: string;
  stationId: number | null;
  stationName: string | null;
}

/** Đăng nhập bằng tài khoản bếp. Tài khoản lễ tân/admin không có khu bếp nên bị từ chối. */
export async function login(username: string, password: string): Promise<Session> {
  const res = await request<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: { username, password },
    auth: false,
  });
  if (res.accountType !== 'KITCHEN' || res.stationId == null || !res.stationName) {
    throw new ApiError(403, 'Đây không phải tài khoản của khu bếp');
  }
  return { token: res.token, username, stationId: res.stationId, stationName: res.stationName };
}
