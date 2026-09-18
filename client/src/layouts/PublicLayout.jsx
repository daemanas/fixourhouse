import { Outlet } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col">
      <Navbar />
      <main className="flex-1 pt-16">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default PublicLayout;