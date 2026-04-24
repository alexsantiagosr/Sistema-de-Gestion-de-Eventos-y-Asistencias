import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  error?: string;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Selecciona una opción',
  className = '',
  error,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={selectRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-2.5 bg-white border rounded-xl flex items-center justify-between transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
          error ? 'border-error ring-error/20 focus:ring-error' : 'border-gray-200 hover:border-gray-300'
        } ${isOpen ? 'ring-2 ring-primary-500 border-transparent' : ''}`}
      >
        <span className={selectedOption ? 'text-foreground' : 'text-secondary/60'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      <div
        className={`absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-lg py-1 max-h-60 overflow-y-auto origin-top transition-all duration-200 ease-out ${
          isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
        }`}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
              option.value === value ? 'bg-primary-50 text-primary font-medium' : 'text-foreground'
            }`}
            onClick={() => {
              onChange(option.value);
              setIsOpen(false);
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
      {error && <p className="mt-1 text-sm text-error">{error}</p>}
    </div>
  );
}
