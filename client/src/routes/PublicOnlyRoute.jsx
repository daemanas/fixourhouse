import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function PublicOnlyRoute({ children }) {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    const redirectPath = user?.role === 'admin' ? '/admin/dashboard' : user?.role === 'provider' ? '/provider/dashboard' : '/customer/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}