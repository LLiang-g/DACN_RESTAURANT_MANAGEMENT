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
    <div className="login">
      <form className="login__card" onSubmit={onSubmit}>
        <h1 className="login__title">Màn hình bếp</h1>
        <p className="login__hint">Đăng nhập bằng tài khoản của khu bếp</p>

        <label className="login__field">
          <span>Tên đăng nhập</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            autoComplete="username"
            required
          />
        </label>

        <label className="login__field">
          <span>Mật khẩu</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && (
          <div className="login__error" role="alert">
            {error}
          </div>
        )}

        <button className="login__submit" type="submit" disabled={submitting}>
          {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </form>
    </div>
  );
}
