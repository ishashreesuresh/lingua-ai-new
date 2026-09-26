import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, Sparkles } from 'lucide-react';
import { LanguageCode, SourceLanguageCode, LANGUAGE_LIST, SUPPORTED_LANGUAGES } from '../types';

interface LanguageSelectorProps {
  type: 'source' | 'target';
  value: SourceLanguageCode;
  onChange: (val: SourceLanguageCode) => void;
  detectedLanguage?: LanguageCode;
  disabled?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  type,
  value,
  onChange,
  detectedLanguage,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  const filteredLanguages = LANGUAGE_LIST.filter((lang) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      lang.name.toLowerCase().includes(q) ||
      lang.nativeName.toLowerCase().includes(q) ||
      lang.code.toLowerCase().includes(q)
    );
  });

  const getLabel = () => {
    if (value === 'auto') {
      if (detectedLanguage && detectedLanguage in SUPPORTED_LANGUAGES) {
        const det = SUPPORTED_LANGUAGES[detectedLanguage];
        return `Detect (${det.name} · ${det.nativeName})`;
      }
      return 'Detect Language';
    }
    const current = SUPPORTED_LANGUAGES[value as LanguageCode];
    return current ? `${current.name} (${current.nativeName})` : value;
  };

  const currentLang = value !== 'auto' ? SUPPORTED_LANGUAGES[value as LanguageCode] : null;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg border transition-all ${
          isOpen
            ? 'border-[#6842E8] ring-2 ring-[#6842E8]/20 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50'
            : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 text-neutral-800 dark:text-neutral-200 hover:border-neutral-300 dark:hover:border-neutral-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {value === 'auto' ? (
          <Sparkles className="w-4 h-4 text-[#6842E8]" />
        ) : (
          <span className="w-5 text-center font-mono text-xs font-semibold text-[#6842E8] uppercase">
            {currentLang?.code}
          </span>
        )}
        <span className="truncate max-w-[160px] sm:max-w-[200px] text-left">
          {getLabel()}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#6842E8]' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-72 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search bar inside dropdown */}
          <div className="p-2 border-b border-neutral-100 dark:border-neutral-800">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search languages..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-md outline-none focus:ring-1 focus:ring-[#6842E8]"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto p-1 divide-y divide-neutral-50 dark:divide-neutral-800/40">
            {/* If source, show Detect Language as top item */}
            {type === 'source' && (
              <button
                type="button"
                onClick={() => {
                  onChange('auto');
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors cursor-pointer ${
                  value === 'auto'
                    ? 'bg-[#EEE9FF] dark:bg-[#6842E8]/20 text-[#6842E8] dark:text-[#A78BFA] font-semibold'
                    : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#6842E8]" />
                  <span>Detect Language</span>
                </div>
                {value === 'auto' && <Check className="w-3.5 h-3.5 text-[#6842E8]" />}
              </button>
            )}

            {filteredLanguages.map((lang) => {
              const isSelected = value === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    onChange(lang.code);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#EEE9FF] dark:bg-[#6842E8]/20 text-[#6842E8] dark:text-[#A78BFA] font-semibold'
                      : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-[11px] font-semibold uppercase text-neutral-400 dark:text-neutral-500 w-5">
                      {lang.code}
                    </span>
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                      {lang.name}
                    </span>
                    <span className="text-neutral-400 dark:text-neutral-500 text-[11px]">
                      {lang.nativeName}
                    </span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#6842E8]" />}
                </button>
              );
            })}

            {filteredLanguages.length === 0 && (
              <div className="py-4 text-center text-xs text-neutral-400">
                No matching languages found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
