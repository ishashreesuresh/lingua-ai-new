import React from 'react';
import { Sparkles, Loader2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { SourceLanguageCode, LanguageCode, LANGUAGE_SCRIPT_LABELS, SUPPORTED_LANGUAGES } from '../types';

interface AITranslationBridgeProps {
  onTranslate: () => void;
  isLoading: boolean;
  buttonState: 'idle' | 'loading' | 'success' | 'error';
  disabled: boolean;
  sourceLanguage: SourceLanguageCode;
  targetLanguage: LanguageCode;
  detectedLanguage?: LanguageCode;
}

export const AITranslationBridge: React.FC<AITranslationBridgeProps> = ({
  onTranslate,
  isLoading,
  buttonState,
  disabled,
  sourceLanguage,
  targetLanguage,
  detectedLanguage,
}) => {
  // Determine dynamic source label
  const getSourceScriptLabel = (): string => {
    if (sourceLanguage !== 'auto') {
      return LANGUAGE_SCRIPT_LABELS[sourceLanguage] || SUPPORTED_LANGUAGES[sourceLanguage]?.nativeName || 'Source';
    }
    if (detectedLanguage && detectedLanguage in LANGUAGE_SCRIPT_LABELS) {
      return LANGUAGE_SCRIPT_LABELS[detectedLanguage];
    }
    return 'Auto';
  };

  // Determine dynamic target label
  const getTargetScriptLabel = (): string => {
    return LANGUAGE_SCRIPT_LABELS[targetLanguage] || SUPPORTED_LANGUAGES[targetLanguage]?.nativeName || 'Target';
  };

  const sourceScript = getSourceScriptLabel();
  const targetScript = getTargetScriptLabel();

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-2 px-1 relative w-full lg:w-auto shrink-0 select-none">
      {/* Dynamic AI Transformation Indicator: SOURCE ─── ✨ AI ───→ TARGET */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-[#1E1D22]/80 border border-neutral-200/90 dark:border-neutral-800 shadow-xs backdrop-blur-xs">
        {/* Source Language Script */}
        <span
          className="text-xs font-bold tracking-tight text-neutral-700 dark:text-neutral-200 px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800/80 font-sans"
          title={`Source: ${sourceLanguage === 'auto' ? 'Auto-detect' : SUPPORTED_LANGUAGES[sourceLanguage]?.name}`}
        >
          {sourceScript}
        </span>

        {/* Connecting flow line to AI */}
        <div className="relative w-8 sm:w-12 h-0.5 bg-neutral-200 dark:bg-neutral-700/80 overflow-hidden rounded-full">
          {isLoading && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#6842E8] to-transparent animate-bridge-flow" />
          )}
        </div>

        {/* Center AI Orb / Sparkle */}
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
            isLoading
              ? 'bg-[#6842E8] text-white shadow-md animate-orb-pulse'
              : 'bg-[#EEE9FF] dark:bg-[#6842E8]/20 text-[#6842E8] dark:text-[#A78BFA]'
          }`}
          title="AI Neural Engine"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </div>

        {/* Connecting flow line with Arrow to Target */}
        <div className="relative w-8 sm:w-12 h-0.5 bg-neutral-200 dark:bg-neutral-700/80 overflow-hidden rounded-full">
          {isLoading && (
            <div className="absolute inset-0 bg-gradient-to-r from-[#6842E8] via-[#8c6bfb] to-transparent animate-bridge-flow" />
          )}
        </div>

        <ArrowRight className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 -ml-1" />

        {/* Target Language Script */}
        <span
          className="text-xs font-bold tracking-tight text-[#6842E8] dark:text-[#A78BFA] px-2 py-0.5 rounded-md bg-[#EEE9FF]/70 dark:bg-[#6842E8]/15 border border-[#6842E8]/20 font-sans"
          title={`Target: ${SUPPORTED_LANGUAGES[targetLanguage]?.name}`}
        >
          {targetScript}
        </span>
      </div>

      {/* Main "Translate with AI" Button */}
      <button
        type="button"
        id="translate-main-btn"
        onClick={onTranslate}
        disabled={disabled}
        className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-sm ${
          buttonState === 'loading'
            ? 'bg-[#532ec7] text-white opacity-95 cursor-wait shadow-md'
            : buttonState === 'success'
            ? 'bg-emerald-600 text-white shadow-md'
            : buttonState === 'error'
            ? 'bg-rose-600 text-white shadow-md'
            : 'bg-[#6842E8] hover:bg-[#5731d1] active:scale-[0.98] text-white shadow-sm hover:shadow-md cursor-pointer'
        } ${disabled && !isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        title="Translate text (Ctrl+Enter)"
        aria-label="Translate with AI"
      >
        {buttonState === 'loading' ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>Translating...</span>
          </>
        ) : buttonState === 'success' ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>Translated ✓</span>
          </>
        ) : buttonState === 'error' ? (
          <>
            <AlertCircle className="w-4 h-4 text-white" />
            <span>Retry Translation</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            <span>Translate with AI</span>
          </>
        )}
      </button>

      {/* Subtle Shortcut Hint */}
      <div className="hidden lg:flex items-center gap-1 text-[11px] text-neutral-400 dark:text-neutral-500 font-mono">
        <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-neutral-200/70 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-300/60 dark:border-neutral-700/60">
          Ctrl + Enter
        </kbd>
      </div>
    </div>
  );
};
