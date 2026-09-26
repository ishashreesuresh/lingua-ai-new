import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  Briefcase,
  Smile,
  Zap,
  Globe,
  Loader2,
  Copy,
  Check,
  X,
  CornerDownLeft,
} from 'lucide-react';
import { SourceLanguageCode, LanguageCode } from '../types';

interface AIAssistPanelProps {
  originalText: string;
  translatedText: string;
  sourceLanguage: SourceLanguageCode;
  targetLanguage: LanguageCode;
  onApplyAssistedText: (text: string) => void;
  onToast: (msg: string, type?: 'info' | 'error' | 'success') => void;
}

type AssistAction = 'explain' | 'formal' | 'casual' | 'simplify' | 'culture';

const ASSIST_ACTIONS: { id: AssistAction; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'explain', label: 'Explain Meaning', icon: BookOpen },
  { id: 'formal', label: 'Make Formal', icon: Briefcase },
  { id: 'casual', label: 'Make Casual', icon: Smile },
  { id: 'simplify', label: 'Simplify Phrasing', icon: Zap },
  { id: 'culture', label: 'Cultural Context', icon: Globe },
];

export const AIAssistPanel: React.FC<AIAssistPanelProps> = ({
  originalText,
  translatedText,
  sourceLanguage,
  targetLanguage,
  onApplyAssistedText,
  onToast,
}) => {
  const [activeAction, setActiveAction] = useState<AssistAction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [assistResult, setAssistResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleRunAssist = async (action: AssistAction) => {
    if (!originalText.trim()) {
      onToast('Please enter text in the translator first', 'info');
      return;
    }

    setActiveAction(action);
    setIsLoading(true);
    setAssistResult(null);

    try {
      const res = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: originalText,
          translation: translatedText,
          sourceLanguage,
          targetLanguage,
          action,
        }),
      });

      if (!res.ok) throw new Error('AI Assist failed');
      const data = await res.json();
      setAssistResult(data.result);
    } catch (e: any) {
      onToast('AI Assist could not complete request. Try again.', 'error');
      setActiveAction(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!assistResult) return;
    try {
      await navigator.clipboard.writeText(assistResult);
      setCopied(true);
      onToast('AI Assist response copied', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onToast('Copy failed', 'error');
    }
  };

  const isTextRewrite = activeAction === 'formal' || activeAction === 'casual' || activeAction === 'simplify';

  return (
    <section
      id="ai-assist"
      className="p-5 rounded-2xl bg-white dark:bg-[#1E1D22] border border-neutral-200/90 dark:border-neutral-800 shadow-sm transition-all"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#6842E8]" />
          <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            Contextual AI Intelligence
          </h2>
          <span className="text-xs text-neutral-400 dark:text-neutral-500 hidden sm:inline">
            · Explore nuances & stylistic adaptations
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {ASSIST_ACTIONS.map(({ id, label, icon: Icon }) => {
          const isActive = activeAction === id;
          return (
            <button
              key={id}
              type="button"
              disabled={isLoading || !originalText.trim()}
              onClick={() => handleRunAssist(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-[#6842E8] text-white shadow-xs font-semibold'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-700'
              } ${isLoading || !originalText.trim() ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Assist Result View */}
      {isLoading && (
        <div className="mt-4 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/60 dark:border-neutral-800 flex items-center justify-center gap-2 text-xs text-neutral-500 animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin text-[#6842E8]" />
          <span>Generating intelligent linguistic assistance...</span>
        </div>
      )}

      {assistResult && !isLoading && (
        <div className="mt-4 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-200/50 dark:border-neutral-800/80">
            <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
              {ASSIST_ACTIONS.find((a) => a.id === activeAction)?.label || 'AI Analysis'}
            </span>
            <div className="flex items-center gap-1.5">
              {isTextRewrite && (
                <button
                  type="button"
                  onClick={() => onApplyAssistedText(assistResult)}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#6842E8] dark:text-[#A78BFA] hover:bg-[#EEE9FF] dark:hover:bg-[#6842E8]/20 rounded transition-colors cursor-pointer"
                  title="Use as translated output"
                >
                  <CornerDownLeft className="w-3.5 h-3.5" />
                  <span>Use as Translation</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCopy}
                className="p-1 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 rounded transition-colors cursor-pointer"
                title="Copy response"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setAssistResult(null);
                  setActiveAction(null);
                }}
                className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap select-text">
            {assistResult}
          </p>
        </div>
      )}
    </section>
  );
};
