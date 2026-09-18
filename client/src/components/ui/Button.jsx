import { forwardRef } from 'react';

const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    icon: Icon,
    className = '',
    disabled,
    ...props
  },
  ref
) {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'btn-outline',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
    success: 'btn-success',
    white: 'bg-white text-primary-700 hover:bg-gray-100 shadow-lg',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2.5 text-sm rounded-xl',
    lg: 'px-6 py-3 text-base rounded-xl',
  };

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span>Loading...</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="h-4 w-4" />}
          {children}
        </>
      )}
    </button>
  );
});

export default Button;