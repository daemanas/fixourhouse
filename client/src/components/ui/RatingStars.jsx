import { Star } from 'lucide-react';

export function RatingStars({ value = 0, onChange, size = 'md', readOnly = false }) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const handleClick = (index) => {
    if (!readOnly && onChange) {
      onChange(index + 1);
    }
  };

  return (
    <div className="flex items-center gap-0.5" role={readOnly ? 'img' : 'radiogroup'} aria-label={`Rating: ${value} out of 5`}>
      {[0, 1, 2, 3, 4].map((index) => (
        <button
          key={index}
          type="button"
          disabled={readOnly}
          onClick={() => handleClick(index)}
          className={`${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform'} p-0.5`}
          aria-label={`${index + 1} star${index > 0 ? 's' : ''}`}
        >
          <Star
            className={`${sizes[size]} ${
              index < Math.round(value)
                ? 'fill-amber-400 text-amber-400'
                : 'fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default RatingStars;