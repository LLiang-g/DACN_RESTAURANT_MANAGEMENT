import type { ReactNode } from "react";
import Sidebar from "./Sidebar";

interface AdminLayoutProps {
  children?: ReactNode;
  onLogout?: () => void;
}

export default function AdminLayout({ children, onLogout }: AdminLayoutProps) {
  return (
    <div className="pos-admin">
      <Sidebar onLogout={onLogout} />
      <main className="main">{children}</main>
    </div>
  );
}
