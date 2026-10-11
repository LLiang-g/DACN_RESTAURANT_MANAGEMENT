import { AuthProvider, useAuth } from './auth/AuthContext';
import KitchenBoardPage from './pages/KitchenBoardPage';
import LoginPage from './pages/LoginPage';

function Gate() {
  const { session, signOut } = useAuth();
  return session ? <KitchenBoardPage session={session} onSignOut={signOut} /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
