import { forwardRef } from 'react';

const Input = forwardRef(function Input(
  {
    label,
    error,
    icon: Icon,
    leftIcon,
    type = 'text',
    className = '',
    hint,
    ...props
  },
  ref
) {
  const renderIcon = () => {
    if (leftIcon) {
      return (
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-gray-400 pointer-events-none">
          {leftIcon}
        </div>
      );
    }
    if (Icon) {
      return (
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      );
    }
    return null;
  };

  const hasIcon = Boolean(leftIcon || Icon);

  return (
    <div className="w-full">
      {label && <label className="label">{label}</label>}
      <div className="relative">
        {renderIcon()}
        <input
          ref={ref}
          type={type}
          className={`input ${hasIcon ? 'pl-10' : ''} ${error ? 'border-danger-500 focus:ring-danger-500' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-sm text-danger-600 dark:text-danger-400">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  );
});

export default Input;