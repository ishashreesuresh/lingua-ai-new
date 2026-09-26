import React from 'react';
import { TranslationMode } from '../types';

interface ModeSelectorProps {
  currentMode: TranslationMode;
  onSelectMode: (mode: TranslationMode) => void;
  disabled?: boolean;
}

const MODES: { id: TranslationMode; label: string; description: string }[] = [
  { id: 'Translate', label: 'Direct', description: 'Accurate literal translation' },
  { id: 'Formal', label: 'Formal', description: 'Elevated, polite register' },
  { id: 'Casual', label: 'Casual', description: 'Natural colloquial phrasing' },
  { id: 'Professional', label: 'Executive', description: 'Business & workplace clarity' },
  { id: 'Simple', label: 'Simple', description: 'Plain vocabulary & short structure' },
];

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  currentMode,
  onSelectMode,
  disabled = false,
}) => {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mr-1 hidden sm:inline">
        Tone Register:
      </span>
      <div className="inline-flex p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-lg border border-neutral-200/80 dark:border-neutral-700/60">
        {MODES.map((mode) => {
          const isActive = currentMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectMode(mode.id)}
              title={mode.description}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 shadow-xs font-semibold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-200/40 dark:hover:bg-neutral-700/40'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {mode.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
