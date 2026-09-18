import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Search, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-light dark:bg-surface-dark px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-lg"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-8xl font-bold text-gradient mb-4"
        >
          404
        </motion.div>
        <h1 className="text-2xl sm:text-3xl font-bold text-ink-light dark:text-ink-dark mb-3">
          Page Not Found
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="btn-primary">
            <Home className="w-4 h-4" />
            Go Home
          </Link>
          <Link to="/customer/search" className="btn-outline">
            <Search className="w-4 h-4" />
            Browse Services
          </Link>
          <button
            onClick={() => window.history.back()}
            className="btn-ghost"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </motion.div>
    </div>
  );
}