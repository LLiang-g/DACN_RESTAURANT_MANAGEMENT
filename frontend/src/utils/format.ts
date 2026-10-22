export const formatNumber = (n: number): string =>
  (n ?? 0).toLocaleString("vi-VN");

export const formatVND = (n: number): string =>
  `${formatNumber(n)}đ`;

export const formatDateTime = (dateStr?: string | null): string => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};
