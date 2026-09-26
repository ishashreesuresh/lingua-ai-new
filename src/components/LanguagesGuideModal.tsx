import React from 'react';
import { X, Languages, ArrowRight, Sparkles } from 'lucide-react';
import { LANGUAGE_LIST, LanguageCode } from '../types';

interface LanguagesGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPair: (source: LanguageCode, target: LanguageCode, sampleText?: string) => void;
}

const SAMPLE_PAIRS: {
  from: LanguageCode;
  to: LanguageCode;
  label: string;
  sample: string;
}[] = [
  { from: 'en', to: 'ta', label: 'English → Tamil', sample: 'Welcome to our AI platform. How can I assist you today?' },
  { from: 'ta', to: 'en', label: 'Tamil → English', sample: 'வணக்கம், உங்களுக்கு இன்று என்ன உதவி தேவை?' },
  { from: 'en', to: 'hi', label: 'English → Hindi', sample: 'Artificial intelligence is transforming multilingual communication.' },
  { from: 'hi', to: 'en', label: 'Hindi → English', sample: 'नमस्ते, आप कैसे हैं? आज का दिन शुभ हो।' },
  { from: 'en', to: 'ml', label: 'English → Malayalam', sample: 'Good morning. Have a productive and pleasant day.' },
  { from: 'ml', to: 'en', label: 'Malayalam → English', sample: 'നമസ്കാരം, ഇത് മലയാളത്തിലുള്ള സന്ദേശമാണ്.' },
  { from: 'en', to: 'te', label: 'English → Telugu', sample: 'Please review the project deliverables before Friday.' },
  { from: 'te', to: 'en', label: 'Telugu → English', sample: 'నమస్కారం, మా అనువాద వ్యవస్థకు స్వాగతం.' },
  { from: 'en', to: 'kn', label: 'English → Kannada', sample: 'Technology connects people across languages and borders.' },
  { from: 'kn', to: 'en', label: 'Kannada → English', sample: 'ನಮಸ್ಕಾರ, ಕನ್ನಡದಲ್ಲಿ ನಿಮ್ಮ ದಿನ ಶುಭವಾಗಲಿ.' },
  { from: 'en', to: 'ja', label: 'English → Japanese', sample: 'Thank you for your prompt cooperation and partnership.' },
  { from: 'ja', to: 'en', label: 'Japanese → English', sample: '本日はお時間をいただき、誠にありがとうございます。' },
  { from: 'en', to: 'fr', label: 'English → French', sample: 'Could you please verify the meeting schedule?' },
  { from: 'fr', to: 'es', label: 'French → Spanish', sample: 'Bonjour, comment se passe votre projet cette semaine ?' },
  { from: 'de', to: 'en', label: 'German → English', sample: 'Guten Tag, wir freuen uns auf eine erfolgreiche Zusammenarbeit.' },
  { from: 'ta', to: 'hi', label: 'Tamil → Hindi', sample: 'எங்கள் புதிய திட்டத்திற்கு உங்கள் ஆதரவை எதிர்பார்க்கிறோம்.' },
  { from: 'hi', to: 'ta', label: 'Hindi → Tamil', sample: 'हम मिलकर एक बेहतरीन उत्पाद तैयार कर रहे हैं।' },
  { from: 'ja', to: 'de', label: 'Japanese → German', sample: '新しい技術革新により、国際的な協力が加速しています。' },
];

export const LanguagesGuideModal: React.FC<LanguagesGuideModalProps> = ({
  isOpen,
  onClose,
  onSelectPair,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-neutral-900/40 dark:bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative w-full max-w-3xl rounded-2xl bg-white dark:bg-[#1A191E] border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#EEE9FF] dark:bg-[#6842E8]/20 text-[#6842E8] flex items-center justify-center">
                <Languages className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Supported Languages & Matrix
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  10 full-duplex languages with end-to-end voice synthesis and transcription
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Languages Grid */}
          <div className="mt-4">
            <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2.5">
              The 10 Supported Languages
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {LANGUAGE_LIST.map((lang) => (
                <div
                  key={lang.code}
                  className="p-2.5 rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#6842E8] uppercase">
                      {lang.code}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {lang.speechLocale}
                    </span>
                  </div>
                  <div className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 mt-1">
                    {lang.name}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    {lang.nativeName}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick-Test Pairs */}
          <div className="mt-6">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-[#6842E8]" />
              <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Quick Test Pairs (Click to load sample)
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {SAMPLE_PAIRS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onSelectPair(item.from, item.to, item.sample);
                    onClose();
                  }}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-900/80 hover:border-[#6842E8]/40 hover:bg-[#EEE9FF]/30 dark:hover:bg-[#6842E8]/10 text-left transition-all cursor-pointer group"
                >
                  <div className="truncate mr-2">
                    <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1">
                      <span>{item.label}</span>
                    </div>
                    <div className="text-[11px] text-neutral-500 truncate mt-0.5">
                      "{item.sample}"
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-[#6842E8] group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
