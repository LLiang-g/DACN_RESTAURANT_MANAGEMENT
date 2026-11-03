import { NavLink } from "../../router/Router";
import { NAV_ITEMS } from "../../config/navigation";
import { getStoredAuth } from "../../services/http";
import { logout } from "../../services/adminApi";

interface SidebarProps {
  onLogout?: () => void;
}

export default function Sidebar({ onLogout }: SidebarProps) {
  const auth = getStoredAuth();

  const handleLogout = () => {
    logout();
    if (onLogout) onLogout();
    else window.location.reload();
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-logo" />
        <div>
          <div className="brand-title">Smart POS & KDS</div>
          <div className="brand-role">Quản lý nhà hàng</div>
        </div>
      </div>

      <nav className="nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
          >
            {item.icon && <span className="nav-icon">{item.icon}</span>}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="avatar">{auth?.username?.charAt(0).toUpperCase() || "A"}</div>
          <div className="user-info">
            <span className="username">{auth?.username || "Admin"}</span>
            <span className="user-badge">{auth?.role || "ADMIN"}</span>
          </div>
        </div>
        <button
          className="btn-logout"
          onClick={handleLogout}
          title="Đăng xuất khỏi hệ thống"
        >
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
