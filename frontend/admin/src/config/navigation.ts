export interface NavItem {
  to: string;
  label: string;
  icon?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: "📊" },
  { to: "/kitchen", label: "Khu vực bếp", icon: "🍳" },
  { to: "/menu", label: "Thực đơn", icon: "🍽️" },
  { to: "/inventory", label: "Kho", icon: "📦" },
  { to: "/tables", label: "Bàn ăn", icon: "🪑" },
  { to: "/staff", label: "Nhân sự", icon: "👥" },
];
