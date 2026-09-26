import React, { useState, useRef, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Copy,
  Check,
  Share2,
  RotateCw,
  Bookmark,
  BookmarkCheck,
  AlertCircle,
  Loader2,
  Sparkles,
  HardDrive,
} from 'lucide-react';
import { LanguageCode, SUPPORTED_LANGUAGES } from '../types';

interface TranslationOutputProps {
  translatedText: string;
  targetLanguage: LanguageCode;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  isFavorited: boolean;
  onToggleFavorite: () => void;
  onToast: (msg: string, type?: 'info' | 'error' | 'success') => void;
  onRequestPronunciation?: () => void;
  onSaveToDrive?: () => void;
}

export const TranslationOutput: React.FC<TranslationOutputProps> = ({
  translatedText,
  targetLanguage,
  isLoading,
  error,
  onRetry,
  isFavorited,
  onToggleFavorite,
  onToast,
  onRequestPronunciation,
  onSaveToDrive,
}) => {
  const [copied, setCopied] = useState(false);
  const [ttsState, setTtsState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  // Stop audio whenever translated text or target language changes
  useEffect(() => {
    stopAudio();
  }, [translatedText, targetLanguage]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setTtsState('idle');
  };

  const handlePlayTTS = async () => {
    if (!translatedText.trim()) return;

    if (ttsState === 'playing') {
      stopAudio();
      return;
    }

    setTtsState('loading');

    try {
      // 1. Call server-side TTS endpoint
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: translatedText,
          language: targetLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error('Server TTS unavailable');
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      audioUrlRef.current = audioUrl;

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        stopAudio();
      };

      audio.onerror = () => {
        console.warn('Audio playback error, trying fallback');
        fallbackSpeechSynthesis();
      };

      await audio.play();
      setTtsState('playing');
    } catch (err) {
      console.warn('Server TTS failed, falling back to speech synthesis:', err);
      fallbackSpeechSynthesis();
    }
  };

  const fallbackSpeechSynthesis = () => {
    if (!('speechSynthesis' in window)) {
      setTtsState('idle');
      onToast('Voice unavailable for this language. Try again.', 'error');
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(translatedText);
      const targetInfo = SUPPORTED_LANGUAGES[targetLanguage];
      if (targetInfo) {
        utterance.lang = targetInfo.speechLocale;
      }

      utterance.onstart = () => {
        setTtsState('playing');
      };
      utterance.onend = () => {
        setTtsState('idle');
      };
      utterance.onerror = () => {
        setTtsState('idle');
        onToast('Voice unavailable for this language. Try again.', 'error');
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      setTtsState('idle');
      onToast('Voice unavailable for this language. Try again.', 'error');
    }
  };

  const handleCopy = async () => {
    if (!translatedText) return;
    try {
      await navigator.clipboard.writeText(translatedText);
      setCopied(true);
      onToast('Translated text copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      onToast('Clipboard permission denied', 'error');
    }
  };

  const handleShare = async () => {
    if (!translatedText) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'LinguaAI Translation',
          text: translatedText,
        });
        onToast('Shared successfully', 'success');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  const targetLangInfo = SUPPORTED_LANGUAGES[targetLanguage];
  const charCount = translatedText.length;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1E1D22] rounded-2xl border border-neutral-200/90 dark:border-neutral-800 shadow-sm transition-all">
      {/* Top action header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 border-b border-neutral-100 dark:border-neutral-800/60">
        <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span>Translation Output</span>
          <span aria-hidden="true">·</span>
          <span className="font-semibold text-neutral-800 dark:text-neutral-200">
            {targetLangInfo?.name || targetLanguage}
          </span>
          <span className="text-neutral-400 dark:text-neutral-500 text-[11px]">
            ({targetLangInfo?.nativeName})
          </span>
        </div>

        {/* Favorite & Actions */}
        <div className="flex items-center gap-1">
          {translatedText && !isLoading && !error && (
            <button
              type="button"
              onClick={onToggleFavorite}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                isFavorited
                  ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
              title={isFavorited ? 'Already saved in Saved Translations' : 'Save to Saved Translations'}
              aria-label="Save translation"
            >
              {isFavorited ? (
                <>
                  <BookmarkCheck className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Save</span>
                </>
              )}
            </button>
          )}

          {translatedText && !isLoading && !error && (
            <button
              type="button"
              onClick={onRetry}
              className="p-1.5 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-md transition-colors cursor-pointer"
              title="Regenerate translation"
              aria-label="Regenerate translation"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Translation Content Area */}
      <div className="flex-1 p-4 flex flex-col justify-between overflow-y-auto">
        {isLoading ? (
          <div className="h-full min-h-[160px] flex flex-col items-center justify-center gap-3 text-neutral-400 dark:text-neutral-500 animate-pulse">
            <Loader2 className="w-6 h-6 animate-spin text-[#6842E8]" />
            <span className="text-sm font-medium">Translating with intelligence...</span>
          </div>
        ) : error ? (
          <div className="h-full min-h-[160px] flex flex-col items-center justify-center gap-3 p-6 text-center">
            <AlertCircle className="w-8 h-8 text-rose-500" />
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Translation unavailable
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs">
                {error}
              </p>
            </div>
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 px-3 py-1.5 text-xs font-medium text-white bg-[#6842E8] hover:bg-[#5632cc] rounded-lg transition-colors cursor-pointer"
            >
              Retry Translation
            </button>
          </div>
        ) : translatedText ? (
          <div className="space-y-4">
            <p className="text-base text-neutral-900 dark:text-neutral-100 leading-relaxed whitespace-pre-wrap select-text">
              {translatedText}
            </p>
          </div>
        ) : (
          <div className="h-full min-h-[160px] flex items-center justify-center text-sm text-neutral-400 dark:text-neutral-600">
            Translation will appear here
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100 dark:border-neutral-800/60">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* TTS Listen Button */}
          <button
            type="button"
            onClick={handlePlayTTS}
            disabled={!translatedText || isLoading || !!error}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              ttsState === 'playing'
                ? 'bg-[#6842E8] text-white shadow-sm'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/70 dark:hover:bg-neutral-700'
            } ${!translatedText || isLoading || error ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            title={ttsState === 'playing' ? 'Stop listening' : 'Listen to pronunciation'}
          >
            {ttsState === 'loading' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Loading...</span>
              </>
            ) : ttsState === 'playing' ? (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span>Stop</span>
                {/* Subtle animated sound-wave equalizer indicator */}
                <span className="flex items-center gap-0.5 ml-1 h-3.5">
                  <span className="w-0.5 bg-white rounded-full animate-wave-1"></span>
                  <span className="w-0.5 bg-white rounded-full animate-wave-2"></span>
                  <span className="w-0.5 bg-white rounded-full animate-wave-3"></span>
                  <span className="w-0.5 bg-white rounded-full animate-wave-4"></span>
                </span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>Listen</span>
              </>
            )}
          </button>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            disabled={!translatedText || isLoading || !!error}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/70 dark:hover:bg-neutral-700'
            } ${!translatedText || isLoading || error ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            title="Copy translated text"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Copied ✓</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>

          {/* Save Translation Button */}
          <button
            type="button"
            onClick={onToggleFavorite}
            disabled={!translatedText || isLoading || !!error}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isFavorited
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/70 dark:hover:bg-neutral-700'
            } ${!translatedText || isLoading || error ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            title={isFavorited ? 'Already saved in Saved Translations' : 'Save translation'}
          >
            {isFavorited ? (
              <>
                <BookmarkCheck className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>✓ Saved</span>
              </>
            ) : (
              <>
                <Bookmark className="w-3.5 h-3.5" />
                <span>Save</span>
              </>
            )}
          </button>

          {/* Share Button */}
          <button
            type="button"
            onClick={handleShare}
            disabled={!translatedText || isLoading || !!error}
            className={`p-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200/70 dark:hover:bg-neutral-700 transition-colors ${
              !translatedText || isLoading || error ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
            }`}
            title="Share translation"
            aria-label="Share translation"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>

          {/* Save to Google Drive Button */}
          {onSaveToDrive && (
            <button
              type="button"
              onClick={onSaveToDrive}
              disabled={!translatedText || isLoading || !!error}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200/70 dark:hover:bg-neutral-700 transition-colors ${
                !translatedText || isLoading || error ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
              }`}
              title="Save translation to Google Drive"
            >
              <HardDrive className="w-3.5 h-3.5 text-[#6842E8]" />
              <span className="hidden sm:inline">Drive</span>
            </button>
          )}

          {/* Pronunciation prompt trigger */}
          {translatedText && onRequestPronunciation && !isLoading && !error && (
            <button
              type="button"
              onClick={onRequestPronunciation}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#6842E8] dark:text-[#A78BFA] bg-[#EEE9FF] dark:bg-[#6842E8]/20 hover:bg-[#e2d9ff] transition-colors cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>Pronunciation</span>
            </button>
          )}
        </div>

        {/* Character Count */}
        {translatedText && (
          <span className="text-xs font-mono tabular-nums text-neutral-400 dark:text-neutral-500">
            {charCount} chars
          </span>
        )}
      </div>
    </div>
  );
};
