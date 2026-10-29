import { useState, type FormEvent } from 'react';
import { authApi } from '../api/authApi';
import './LoginPage.css';

interface Props {
  onLoginSuccess: () => void;
}

export default function LoginPage({ onLoginSuccess }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await authApi.login(username, password);

      // Chặn ngay tại UI: tài khoản không phải Lễ tân thì không cho vào trang này,
      // dù backend có thể cũng tự chặn ở route /api/pos/** (403) — chặn sớm ở đây
      // để thông báo rõ ràng hơn thay vì để người dùng bấm lung tung rồi mới thấy lỗi.
      if (data.role !== 'RECEPTIONIST') {
        setError('Tài khoản này không có quyền truy cập trang Lễ tân.');
        return;
      }

      localStorage.setItem('accessToken', data.token);
      localStorage.setItem('username', username);
      onLoginSuccess();
    } catch {
      // Không phân biệt rõ "sai username" hay "sai password" trong thông báo
      // (tránh lộ thông tin tài khoản nào tồn tại — cùng lý do GlobalExceptionHandler
      // trả message chung "Sai tên đăng nhập hoặc mật khẩu" cho AuthenticationException)
      setError('Sai tài khoản hoặc mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form onSubmit={handleSubmit} className="login-form">
        <h2>Smart POS & KDS</h2>
        <p className="login-subtitle">Đăng nhập nhân viên</p>

        <label>
          Tài khoản
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        </label>
        <label>
          Mật khẩu
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>

        {error && <p className="login-error">{error}</p>}

        <button type="submit" disabled={loading || !username || !password}>
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>
    </div>
  );
}