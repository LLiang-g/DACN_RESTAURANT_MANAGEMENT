import axios from 'axios';

// Relative URLs use the Vite/Nginx proxy, as before.
export const apiClient = axios.create({ baseURL: '' });

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void): () => void {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = null;
  };
}

function isLoginRequest(url?: string): boolean {
  return url?.split('?')[0] === '/api/auth/login';
}

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token && !isLoginRequest(config.url)) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && !isLoginRequest(error.config?.url)) {
      const currentToken = localStorage.getItem('accessToken');
      const sentAuthorization = error.config?.headers?.Authorization;
      // A late response from an older session must not clear a newly logged-in session.
      if (currentToken && sentAuthorization === `Bearer ${currentToken}`) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('username');
        unauthorizedHandler?.();
      }
    }
    // Preserve API errors for existing form handlers; never replay payment/order requests.
    return Promise.reject(error);
  },
);