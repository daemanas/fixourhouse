import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export function Modal({ isOpen, onClose, title, subtitle, children, size = 'md' }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className={`w-full ${sizes[size]} bg-white dark:bg-gray-900 rounded-2xl shadow-hover border border-border-light dark:border-border-dark`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-6 pb-4">
              <div>
                {title && <h2 className="text-xl font-semibold text-ink-light dark:text-ink-dark">{title}</h2>}
                {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 pb-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default Modal;