import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar';
import Topbar from '../components/common/Topbar';
import CustomerBottomNav from '../components/common/CustomerBottomNav';

export function DashboardLayout({ items, title, subtitle, showSearch = false, compactHeader = false, customerDashboardHeader = false, customerLayout = false, showCustomerHeader = false }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex">
      <Sidebar
        items={items}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        desktopOnly={customerLayout}
      />
      <div className="flex-1 flex flex-col min-w-0">
        {(!customerLayout || customerDashboardHeader || showCustomerHeader) && <Topbar
          title={title}
          subtitle={subtitle}
          showSearch={showSearch}
          compact={compactHeader}
          customerDashboard={customerDashboardHeader}
          hideMenuButton={customerLayout}
          onMenuClick={() => setIsSidebarOpen(true)}
        />}
        <main className={`flex-1 p-4 sm:p-6 lg:p-8 ${customerLayout ? 'pb-28 sm:pb-28 lg:pb-8' : ''}`}>
          <Outlet />
        </main>
      </div>
      {customerLayout && <CustomerBottomNav />}
    </div>
  );
}

export default DashboardLayout;