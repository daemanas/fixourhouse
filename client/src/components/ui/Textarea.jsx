import { forwardRef } from 'react';

const Textarea = forwardRef(function Textarea(
  { label, error, rows = 4, className = '', ...props },
  ref
) {
  return (
    <div className="w-full">
      {label && <label className="label">{label}</label>}
      <textarea
        ref={ref}
        rows={rows}
        className={`input resize-none ${error ? 'border-danger-500 focus:ring-danger-500' : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1.5 text-sm text-danger-600 dark:text-danger-400">{error}</p>}
    </div>
  );
});

export default Textarea;