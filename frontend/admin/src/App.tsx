import { useState, useEffect } from "react";
import { RouterProvider, useRouter } from "./router/Router";
import AdminLayout from "./components/layout/AdminLayout";
import DashboardPage from "./pages/DashboardPage";
import MenuPage from "./pages/MenuPage";
import InventoryPage from "./pages/InventoryPage";
import KitchenPage from "./pages/KitchenPage";
import TablesPage from "./pages/TablesPage";
import StaffPage from "./pages/StaffPage";
import LoginPage from "./pages/LoginPage";
import { getStoredAuth, setStoredAuth, HttpError } from "./services/http";
import { getAdminSession } from "./services/adminApi";
import "./styles/admin.css";

function AppContent({ onLogout }: { onLogout: () => void }) {
  const { pathname } = useRouter();

  const renderPage = () => {
    switch (pathname) {
      case "/kitchen":
        return <KitchenPage />;
      case "/menu":
        return <MenuPage />;
      case "/inventory":
        return <InventoryPage />;
      case "/tables":
        return <TablesPage />;
      case "/staff":
        return <StaffPage />;
      case "/dashboard":
      default:
        return <DashboardPage />;
    }
  };

  return <AdminLayout onLogout={onLogout}>{renderPage()}</AdminLayout>;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(() => !!getStoredAuth());
  const [sessionError, setSessionError] = useState(false);
  const [sessionAttempt, setSessionAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const handleAuthExpired = () => {
      setIsAuthenticated(false);
    };
    window.addEventListener("admin_auth_expired", handleAuthExpired);
    if (getStoredAuth()) {
      getAdminSession()
        .then(() => { if (active) setIsAuthenticated(true); })
        .catch(error => {
          if (!active) return;
          if (error instanceof HttpError && error.status === 403) {
            setStoredAuth(null);
            setIsAuthenticated(false);
          } else if (getStoredAuth()) setSessionError(true);
        })
        .finally(() => { if (active) setCheckingSession(false); });
    }
    return () => {
      active = false;
      window.removeEventListener("admin_auth_expired", handleAuthExpired);
    };
  }, [sessionAttempt]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setStoredAuth(null);
    setSessionError(false);
    setIsAuthenticated(false);
  };

  if (checkingSession) {
    return <div className="login-wrapper" role="status">Đang kiểm tra phiên đăng nhập...</div>;
  }

  if (sessionError) {
    return <div className="login-wrapper"><div className="login-card">
      <p role="alert">Không thể kiểm tra phiên đăng nhập. Vui lòng kiểm tra kết nối máy chủ.</p>
      <button className="btn-primary" onClick={() => {
        setSessionError(false);
        setCheckingSession(true);
        setSessionAttempt(attempt => attempt + 1);
      }}>Thử lại</button>
      <button className="btn-outline" onClick={handleLogout}>Về trang đăng nhập</button>
    </div></div>;
  }

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <RouterProvider>
      <AppContent onLogout={handleLogout} />
    </RouterProvider>
  );
}
