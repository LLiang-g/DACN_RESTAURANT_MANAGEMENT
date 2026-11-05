import { useState } from 'react';
import type { FormEvent } from 'react';
import { errorMessage } from '../api/httpClient';
import { useAuth } from '../auth/AuthContext';

export default function LoginPage() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await signIn(username.trim(), password);
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="login"><aside className="login__story"><div className="kds-brand"><span className="kds-logo" aria-hidden="true">S·</span><div>SMART KITCHEN<small>ĐIỀU PHỐI CHẾ BIẾN</small></div></div><div className="login__story-body"><p className="kds-eyebrow">CÙNG NHAU GIỮ NHỊP PHỤC VỤ</p><h1>Giữ nhịp bếp.<br /><em>Trọn vẹn<br />bữa ngon.</em></h1><p>Nắm rõ món cần làm, theo dõi thời gian chế biến và phối hợp cùng các khu bếp.</p></div><p className="login__story-footer">Dành cho đội ngũ nhà bếp</p></aside>
      <main className="login__entry"><form className="login__card" onSubmit={onSubmit}><span className="kds-logo" aria-hidden="true">S·</span><p className="kds-eyebrow">SẴN SÀNG VÀO BẾP</p><h1 className="login__title">Bắt đầu chế biến.</h1><p className="login__hint">Đăng nhập bằng tài khoản khu bếp được phân công.</p><label className="login__field"><span>Tên đăng nhập</span><input value={username} onChange={event => setUsername(event.target.value)} autoFocus autoComplete="username" required placeholder="Nhập tên đăng nhập" /></label><label className="login__field"><span>Mật khẩu</span><input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required placeholder="Nhập mật khẩu" /></label>{error && <div className="login__error" role="alert">{error}</div>}<button className="login__submit" type="submit" disabled={submitting}>{submitting ? 'Đang đăng nhập…' : 'Vào khu bếp'} <span aria-hidden="true">→</span></button><p className="login__note">Mỗi tài khoản chỉ thao tác với món thuộc khu bếp của mình.</p></form><p className="login__entry-footer">SMART POS & KDS · VẬN HÀNH NHÀ HÀNG</p></main>
    </div>
  );
}