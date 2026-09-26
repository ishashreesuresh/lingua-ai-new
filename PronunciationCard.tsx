import React, { useState } from 'react';
import { Volume2, X, Copy, Check, Sparkles } from 'lucide-react';
import { LanguageCode, SUPPORTED_LANGUAGES } from '../types';

interface PronunciationCardProps {
  pronunciation: string;
  language: LanguageCode;
  onClose: () => void;
  onToast: (msg: string, type?: 'info' | 'error' | 'success') => void;
}

export const PronunciationCard: React.FC<PronunciationCardProps> = ({
  pronunciation,
  language,
  onClose,
  onToast,
}) => {
  const [copied, setCopied] = useState(false);
  const langInfo = SUPPORTED_LANGUAGES[language];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pronunciation);
      setCopied(true);
      onToast('Pronunciation guide copied', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onToast('Clipboard failed', 'error');
    }
  };

  return (
    <div className="p-4 rounded-xl border border-[#6842E8]/20 bg-[#EEE9FF]/40 dark:bg-[#6842E8]/10 backdrop-blur-xs animate-in fade-in slide-in-from-top-2 duration-150">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#6842E8]/15">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#6842E8]" />
          <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
            Pronunciation & Transliteration
          </span>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            ({langInfo?.name})
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 rounded transition-colors cursor-pointer"
            title="Copy pronunciation"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 italic leading-relaxed select-text">
        {pronunciation}
      </p>
    </div>
  );
};
