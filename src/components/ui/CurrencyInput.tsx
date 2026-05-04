import React, { useState, useEffect, useCallback } from 'react';
import { formatNumberWithSpaces } from '../../utils/currency';

interface CurrencyInputProps {
  value: number | string;
  onChange: (value: number) => void;
  currencySymbol?: string;
  placeholder?: string;
  className?: string;
  id?: string;
  name?: string;
  required?: boolean;
  min?: number;
  disabled?: boolean;
}

const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  currencySymbol = 'FCFA',
  placeholder = '0',
  className = '',
  id,
  name,
  required,
  min = 0,
  disabled = false,
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
      if (numValue === 0) {
        setDisplayValue('');
      } else {
        setDisplayValue(formatNumberWithSpaces(numValue));
      }
    }
  }, [value, isFocused]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\s/g, '').replace(/,/g, '.');

    if (rawValue === '' || rawValue === '-') {
      setDisplayValue(rawValue);
      onChange(0);
      return;
    }

    const numValue = parseFloat(rawValue);
    if (!isNaN(numValue)) {
      setDisplayValue(rawValue);
      onChange(numValue);
    }
  }, [onChange]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
    if (numValue === 0) {
      setDisplayValue('');
    } else {
      setDisplayValue(numValue.toString());
    }
  }, [value]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
    if (numValue === 0) {
      setDisplayValue('');
    } else {
      setDisplayValue(formatNumberWithSpaces(numValue));
    }
  }, [value]);

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        id={id}
        name={name}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`appearance-none block w-full pl-12 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm ${className}`}
      />
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <span className="text-gray-500 sm:text-sm">{currencySymbol}</span>
      </div>
    </div>
  );
};

export default CurrencyInput;
