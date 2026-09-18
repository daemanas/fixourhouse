import { NavLink, useNavigate } from 'react-router-dom';
import { Wrench, X, LogOut, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Avatar from '../ui/Avatar';

export function Sidebar({ items, isOpen, onClose }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getRoleLabel = () => {
    if (user?.role === 'admin') return 'Administrator';
    if (user?.role === 'provider') return 'Service Provider';
    return 'Customer';
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-72 bg-white dark:bg-gray-900 border-r border-border-light dark:border-border-dark flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-border-light dark:border-border-dark">
          <NavLink to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-600 to-secondary-600 flex items-center justify-center">
              <Wrench className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-ink-light dark:text-ink-dark">
              Local<span className="text-primary-600 dark:text-primary-400">Fix</span>
            </span>
          </NavLink>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User info */}
        <div className="px-6 py-4 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center gap-3">
            <Avatar src={user?.avatar} name={user?.name || 'User'} size="md" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-light dark:text-ink-dark truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{getRoleLabel()}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-ink-light dark:hover:text-ink-dark'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="px-4 py-4 border-t border-border-light dark:border-border-dark space-y-1">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;