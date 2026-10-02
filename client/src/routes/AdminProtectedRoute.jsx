import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useAuth } from '../context/AuthContext';

export function AdminProtectedRoute({ children }) {
  const { admin, isAuthenticated, loading } = useAdminAuth();
  const { user, isAuthenticated: hasRegularSession } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3fbf7]">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-700 border-t-transparent" aria-label="Checking admin session" />
      </div>
    );
  }

  if (isAuthenticated && admin?.role === 'admin') return children || <Outlet />;

  if (hasRegularSession && user?.role !== 'admin') {
    return <Navigate to={user?.role === 'provider' ? '/provider/dashboard' : '/customer/dashboard'} replace />;
  }

  return <Navigate to="/admin/login" state={{ from: location }} replace />;
}
