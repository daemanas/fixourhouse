import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import env from '../config/env';

export function ProtectedRoute({ children, roles = [] }) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (roles.length > 0 && !roles.includes(user?.role)) {
    const redirectPath = user?.role === env.ROLES.ADMIN
      ? '/admin/analytics'
      : user?.role === env.ROLES.PROVIDER
        ? '/provider/dashboard'
        : '/';
    return <Navigate to={redirectPath} replace />;
  }

  return children || <Outlet />;
}