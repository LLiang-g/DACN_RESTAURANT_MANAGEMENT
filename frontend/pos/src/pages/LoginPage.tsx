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
      <aside className="login-story" aria-label="Smart POS">
        <div className="login-brand"><span>S·</span> SMART POS & KDS</div>
        <div className="login-story-body"><p className="login-eyebrow">KHÔNG GIAN PHỤC VỤ</p><h1>Mọi bàn.<br />Mọi đơn.<br /><em>Cùng một nhịp.</em></h1><p>Từ lúc đón khách đến khi hoàn tất hóa đơn, luôn nắm rõ điều cần làm tiếp theo.</p><div className="login-line-art" aria-hidden="true"><span /><span /><span /><span /><span /></div></div>
        <p className="login-story-footer">Dành cho đội ngũ lễ tân và thu ngân</p>
      </aside>
      <main className="login-entry"><form className="login-form" onSubmit={handleSubmit}>
        <span className="login-form-mark" aria-hidden="true">S·</span><p className="login-eyebrow">CHÀO MỪNG TRỞ LẠI</p><h2>Bắt đầu phục vụ.</h2><p className="login-subtitle">Đăng nhập tài khoản lễ tân để vào quầy quản lý.</p>
        <label>Tên đăng nhập<input value={username} onChange={e => setUsername(e.target.value)} placeholder="Nhập tên đăng nhập" autoComplete="username" autoFocus required /></label>
        <label>Mật khẩu<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Nhập mật khẩu" autoComplete="current-password" required /></label>
        {error && <p className="login-error" role="alert">{error}</p>}
        <button type="submit" disabled={loading || !username || !password}>{loading ? 'Đang đăng nhập…' : 'Đăng nhập vào quầy'} <span aria-hidden="true">→</span></button>
        <p className="login-form-note">Sử dụng tài khoản được cấp bởi quản trị nhà hàng.</p>
      </form><p className="login-entry-footer">SMART POS & KDS · VẬN HÀNH NHÀ HÀNG</p></main>
    </div>
  );
}