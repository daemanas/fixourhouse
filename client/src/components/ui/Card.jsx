export function Card({ children, className = '', hover = false, ...props }) {
  return (
    <div className={`card ${hover ? 'card-hover' : ''} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between p-6 pb-4 ${className}`}>
      <div>
        {title && <h3 className="text-lg font-semibold text-ink-light dark:text-ink-dark">{title}</h3>}
        {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ children, className = '' }) {
  return <div className={`p-6 pt-0 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 border-t border-border-light dark:border-border-dark ${className}`}>
      {children}
    </div>
  );
}

export default Card;
