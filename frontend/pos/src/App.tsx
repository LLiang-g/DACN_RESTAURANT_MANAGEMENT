import { useState } from 'react';
import LoginPage from './pages/LoginPage';
import PosDashboard from './pages/PosDashboard';
import './App.css';

function App() {
  // Khởi tạo state bằng hàm (lazy initializer) để chỉ đọc localStorage
  // 1 lần duy nhất lúc mount, không đọc lại ở mỗi lần re-render.
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('accessToken'));

  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    setIsLoggedIn(false);
  };

  return <PosDashboard onLogout={handleLogout} />;
}

export default App;