import { useCallback, useLayoutEffect, useState } from 'react';
import LoginPage from './pages/LoginPage';
import PosDashboard from './pages/PosDashboard';
import { setUnauthorizedHandler } from './api/client';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('accessToken'));
  const [sessionExpired, setSessionExpired] = useState(false);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('username');
    setSessionExpired(false);
    setIsLoggedIn(false);
  }, []);

  // Register before child passive effects start fetching protected data.
  useLayoutEffect(() => setUnauthorizedHandler(() => {
    setSessionExpired(true);
    setIsLoggedIn(false);
  }), []);

  if (!isLoggedIn) {
    return (
      <>
        {sessionExpired && (
          <p role="alert">Phiên đăng nhập đã hết hạn hoặc không còn hợp lệ. Vui lòng đăng nhập lại.</p>
        )}
        <LoginPage onLoginSuccess={() => {
          setSessionExpired(false);
          setIsLoggedIn(true);
        }} />
      </>
    );
  }

  return <PosDashboard onLogout={handleLogout} />;
}

export default App;