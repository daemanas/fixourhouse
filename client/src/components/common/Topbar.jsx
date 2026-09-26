import { Menu, Search } from 'lucide-react';
import NotificationMenu from './NotificationMenu';

export function Topbar({ title, subtitle, onMenuClick, showSearch = false }) {
  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-b border-border-light dark:border-border-dark">
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-ink-light dark:text-ink-dark">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {showSearch && (
            <div className="hidden md:block relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="input pl-10 w-64"
              />
            </div>
          )}
          <NotificationMenu />
        </div>
      </div>
    </header>
  );
}

export default Topbar;
