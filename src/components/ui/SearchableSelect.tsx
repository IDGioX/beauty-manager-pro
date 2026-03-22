import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, Search, X } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  subtitle?: string;
  metadata?: string;
}

interface SearchableSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  error?: string;
  helperText?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = "Seleziona un'opzione...",
  required = false,
  disabled = false,
  icon,
  error,
  helperText,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter options by label AND subtitle
  const filteredOptions = options.filter((option) => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    if (option.label.toLowerCase().includes(term)) return true;
    if (option.subtitle && option.subtitle.toLowerCase().includes(term)) return true;
    if (option.metadata && option.metadata.toLowerCase().includes(term)) return true;
    return false;
  });

  const selectedOption = options.find((opt) => opt.value === value);

  // Calculate dropdown position
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Update position on scroll/resize while open
  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleUpdate = () => updatePosition();
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);
    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isOpen, updatePosition]);

  // Reset highlighted index when search changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm]);

  // Keyboard navigation (handled on input element to prevent Modal Escape conflict)
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        onChange(filteredOptions[highlightedIndex].value);
        setIsOpen(false);
        setSearchTerm('');
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  // Render dropdown via portal to escape modal overflow
  const renderDropdown = () => {
    if (!isOpen || !dropdownPos) return null;

    return ReactDOM.createPortal(
      <div
        ref={dropdownRef}
        className="fixed rounded-xl shadow-2xl overflow-hidden"
        style={{
          top: dropdownPos.top,
          left: dropdownPos.left,
          width: dropdownPos.width,
          zIndex: 150,
          background: 'var(--card-bg, #fff)',
          border: '2px solid var(--color-primary, #6366f1)',
        }}
      >
        {/* Search Input */}
        <div className="p-3" style={{ borderBottom: '1px solid var(--glass-border)' }}>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 transform -translate-y-1/2"
              style={{ color: 'var(--color-text-muted)' }}
            />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleInputKeyDown}
              onClick={(e) => e.stopPropagation()}
              placeholder="Cerca..."
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2"
              style={{
                background: 'var(--input-bg, var(--glass-border))',
                border: '1px solid var(--glass-border)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>
        </div>

        {/* Options List */}
        <div className="max-h-60 overflow-y-auto scrollbar-hidden">
          {filteredOptions.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Nessun risultato trovato
            </div>
          ) : (
            filteredOptions.map((option, index) => (
              <div
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className="px-4 py-2.5 cursor-pointer transition-colors"
                style={{
                  background:
                    option.value === value
                      ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)'
                      : index === highlightedIndex
                      ? 'var(--glass-border)'
                      : 'transparent',
                  color:
                    option.value === value
                      ? 'var(--color-primary)'
                      : 'var(--color-text-primary)',
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <div className="font-medium text-sm">{option.label}</div>
                {option.subtitle && (
                  <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    {option.subtitle}
                  </div>
                )}
                {option.metadata && (
                  <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
                    {option.metadata}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
          {label}
          {required && <span className="ml-1" style={{ color: 'rgb(239, 68, 68)' }}>*</span>}
        </label>
      )}

      <div className="relative" ref={triggerRef}>
        {/* Trigger */}
        <div
          onClick={handleToggle}
          className={`
            relative w-full ${icon ? 'pl-10' : 'pl-4'} ${value && !disabled ? 'pr-20' : 'pr-10'} py-2.5
            rounded-xl cursor-pointer
            transition-all duration-200
            ${disabled ? 'cursor-not-allowed opacity-60' : ''}
          `}
          style={{
            background: 'var(--input-bg, var(--card-bg))',
            border: error
              ? '2px solid rgb(239, 68, 68)'
              : isOpen
              ? '2px solid var(--color-primary)'
              : '2px solid var(--glass-border)',
            color: 'var(--color-text-primary)',
          }}
        >
          {/* Icon */}
          {icon && (
            <div className="absolute left-3.5 top-1/2 transform -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }}>
              {icon}
            </div>
          )}

          {/* Selected value or placeholder */}
          <div className="pr-1 min-w-0">
            {selectedOption ? (
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="font-medium truncate flex-shrink-0" style={{ color: 'var(--color-text-primary)' }}>
                  {selectedOption.label}
                </span>
                {selectedOption.subtitle && (
                  <span className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                    {selectedOption.subtitle}
                  </span>
                )}
              </div>
            ) : (
              <span style={{ color: 'var(--color-text-muted)' }}>{placeholder}</span>
            )}
          </div>

          {/* Clear button */}
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-9 top-1/2 transform -translate-y-1/2 p-1 rounded transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text-primary)'; e.currentTarget.style.background = 'var(--glass-border)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.background = 'transparent'; }}
            >
              <X size={14} />
            </button>
          )}

          {/* Chevron */}
          <div className="absolute right-3.5 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <ChevronDown
              size={16}
              className={`transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`}
              style={{ color: 'var(--color-text-muted)' }}
            />
          </div>
        </div>
      </div>

      {/* Dropdown rendered via portal */}
      {renderDropdown()}

      {/* Error Message */}
      {error && (
        <p className="mt-1.5 text-xs font-medium flex items-center gap-1" style={{ color: 'rgb(239, 68, 68)' }}>
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}

      {/* Helper Text */}
      {helperText && !error && (
        <p className="mt-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>{helperText}</p>
      )}
    </div>
  );
};
