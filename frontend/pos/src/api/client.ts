import axios from 'axios';

// Không truyền baseURL tuyệt đối (http://localhost:8080) — để trống, dùng đường dẫn
// tương đối ("/api/...") thì request mới đi qua proxy của Vite (vite.config.ts) thay vì
// gọi thẳng cross-origin tới 8080, nhờ đó tận dụng được cơ chế xoá Origin header vừa làm.
export const apiClient = axios.create({
  baseURL: '',
});

// Interceptor: mọi request gửi đi đều tự động gắn Authorization header
// nếu đã có token trong localStorage — tránh phải lặp lại ở từng API call.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});