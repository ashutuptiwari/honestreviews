import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input: React.FC<InputProps> = ({ label, error, className, ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs sm:text-sm font-medium text-light-text dark:text-dark-text mb-1 sm:mb-2">
          {label}
        </label>
      )}
      <input
        className={`input text-sm sm:text-base ${
          error ? 'border-red-500 dark:border-red-400 focus:ring-red-500' : ''
        } ${className || ''}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};

export default Input;
