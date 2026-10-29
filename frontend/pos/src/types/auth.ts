export interface LoginResponse {
  token: string;
  accountType: string;
  role: string;
  stationId: number | null;
  stationName: string | null;
}