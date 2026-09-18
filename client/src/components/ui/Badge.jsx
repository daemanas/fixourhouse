export function Badge({ children, variant = 'neutral', className = '', ...props }) {
  const variants = {
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    primary: 'badge-primary',
    secondary: 'badge-secondary',
    neutral: 'badge-neutral',
  };

  return (
    <span className={`${variants[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
}

export default Badge;