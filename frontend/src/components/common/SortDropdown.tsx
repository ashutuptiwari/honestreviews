import React from 'react';

interface SortOption {
  label: string;
  value: string;
  order: 'asc' | 'desc';
}

interface SortDropdownProps {
  options: SortOption[];
  currentSort: string;
  currentOrder: 'asc' | 'desc';
  onChange: (sort: string, order: 'asc' | 'desc') => void;
  label?: string;
}

export const SortDropdown: React.FC<SortDropdownProps> = ({
  options,
  currentSort,
  currentOrder,
  onChange,
  label = 'Sort by',
}) => {
  const currentOption = options.find(
    opt => opt.value === currentSort && opt.order === currentOrder
  );

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [value, order] = e.target.value.split(':');
    onChange(value, order as 'asc' | 'desc');
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
      <label className="text-xs sm:text-sm font-medium text-light-text dark:text-dark-text">
        {label}:
      </label>
      <select
        value={`${currentSort}:${currentOrder}`}
        onChange={handleChange}
        className="w-full sm:w-auto px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-light-surface dark:bg-dark-surface text-light-text dark:text-dark-text border border-light-border dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-light-primary dark:focus:ring-dark-primary transition-colors"
      >
        {options.map((option) => (
          <option key={`${option.value}:${option.order}`} value={`${option.value}:${option.order}`}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};
