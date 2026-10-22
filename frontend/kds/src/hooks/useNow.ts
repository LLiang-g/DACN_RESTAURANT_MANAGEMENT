import { useEffect, useState } from 'react';

/** Trả về thời gian hiện tại (ms), cập nhật mỗi giây để đồng hồ SLA chạy. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
