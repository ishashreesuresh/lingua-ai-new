import React from 'react';
import { X, Trash2, Copy, Check, ArrowRight, CornerDownLeft, Clock } from 'lucide-react';
import { HistoryItem, SUPPORTED_LANGUAGES } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onToast: (msg: string, type?: 'info' | 'error' | 'success') => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onSelect,
  onDelete,
  onClearAll,
  onToast,
}) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = async (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      onToast('Translation copied', 'success');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      onToast('Clipboard failed', 'error');
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-900/40 dark:bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-[#1A191E] border-l border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#6842E8]" />
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Translation History
              </h2>
              <span className="text-xs font-mono font-medium text-neutral-400">
                ({history.length})
              </span>
            </div>

            <div className="flex items-center gap-2">
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="text-xs text-rose-500 hover:text-rose-600 font-medium px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg transition-colors cursor-pointer"
                aria-label="Close history"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {history.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center text-neutral-400 dark:text-neutral-600">
                <Clock className="w-8 h-8 stroke-1 mb-2" />
                <p className="text-sm font-medium">No recent translations</p>
                <p className="text-xs mt-1">Your translations will appear here automatically.</p>
              </div>
            ) : (
              history.map((item) => {
                const srcName =
                  item.sourceLanguage === 'auto'
                    ? item.detectedLanguage
                      ? `${SUPPORTED_LANGUAGES[item.detectedLanguage]?.name}`
                      : 'Auto'
                    : SUPPORTED_LANGUAGES[item.sourceLanguage]?.name || item.sourceLanguage;
                const tgtName =
                  SUPPORTED_LANGUAGES[item.targetLanguage]?.name || item.targetLanguage;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      onSelect(item);
                      onClose();
                    }}
                    className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-[#6842E8]/40 dark:hover:border-[#6842E8]/40 bg-neutral-50/60 dark:bg-neutral-900/60 hover:bg-white dark:hover:bg-neutral-800/80 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
                      <div className="flex items-center gap-1.5 font-medium text-neutral-700 dark:text-neutral-300">
                        <span>{srcName}</span>
                        <ArrowRight className="w-3 h-3 text-neutral-400" />
                        <span>{tgtName}</span>
                      </div>
                      <span className="font-mono text-[11px]">{formatTime(item.timestamp)}</span>
                    </div>

                    <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-1.5">
                      {item.originalText}
                    </p>
                    <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100 line-clamp-2">
                      {item.translatedText}
                    </p>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-neutral-200/50 dark:border-neutral-800/60 text-xs">
                      <span className="text-[#6842E8] group-hover:underline flex items-center gap-1">
                        <CornerDownLeft className="w-3 h-3" />
                        Restore to editor
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleCopy(item.translatedText, item.id, e)}
                          className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded transition-colors"
                          title="Copy translated text"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(item.id);
                          }}
                          className="p-1 text-neutral-400 hover:text-rose-500 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
