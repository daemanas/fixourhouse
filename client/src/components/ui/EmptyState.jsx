import { motion } from 'framer-motion';

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      {Icon && (
        <div className="h-16 w-16 rounded-2xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mb-4">
          <Icon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-ink-light dark:text-ink-dark">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}

export default EmptyState;