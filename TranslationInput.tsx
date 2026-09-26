import React, { useRef, useState, useEffect } from 'react';
import { Mic, X, Clipboard, Loader2 } from 'lucide-react';
import { SourceLanguageCode, LanguageCode, SUPPORTED_LANGUAGES } from '../types';

interface TranslationInputProps {
  value: string;
  onChange: (val: string) => void;
  onTranslate: () => void;
  onClear: () => void;
  isLoading: boolean;
  sourceLanguage: SourceLanguageCode;
  detectedLanguage?: LanguageCode;
  onToast: (msg: string, type?: 'info' | 'error' | 'success') => void;
}

type MicState = 'idle' | 'permission' | 'recording' | 'processing';

export const TranslationInput: React.FC<TranslationInputProps> = ({
  value,
  onChange,
  onTranslate,
  onClear,
  isLoading,
  sourceLanguage,
  detectedLanguage,
  onToast,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [micState, setMicState] = useState<MicState>('idle');
  const [recognitionSupported, setRecognitionSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check SpeechRecognition support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setRecognitionSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  const getEffectiveSpeechLocale = (): string => {
    if (sourceLanguage !== 'auto' && sourceLanguage in SUPPORTED_LANGUAGES) {
      return SUPPORTED_LANGUAGES[sourceLanguage as LanguageCode].speechLocale;
    }
    if (detectedLanguage && detectedLanguage in SUPPORTED_LANGUAGES) {
      return SUPPORTED_LANGUAGES[detectedLanguage].speechLocale;
    }
    return 'en-US';
  };

  const startVoiceInput = async () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onToast('Microphone speech recognition is not supported in this browser.', 'error');
      return;
    }

    // If currently recording or processing, clicking stops recording
    if (micState === 'recording' || micState === 'processing') {
      setMicState('processing');
      try {
        recognitionRef.current?.stop();
      } catch {}
      return;
    }

    // Explicitly request native microphone access
    setMicState('permission');

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Immediately release tracks so SpeechRecognition has sole access to the microphone
        stream.getTracks().forEach((track) => track.stop());
      } catch (err: any) {
        setMicState('idle');
        console.warn('Microphone permission denied:', err);
        onToast('Microphone access is required for voice input.', 'error');
        return;
      }
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = getEffectiveSpeechLocale();

      recognition.onstart = () => {
        setMicState('recording');
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          onChange(value ? `${value} ${transcript}` : transcript);
        }
      };

      recognition.onspeechend = () => {
        setMicState('processing');
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setMicState('idle');
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          onToast('Microphone access is required for voice input.', 'error');
        } else if (event.error === 'no-speech') {
          // Natural speech pause, ignore
        } else if (event.error === 'audio-capture') {
          onToast('No microphone was found or microphone is already in use.', 'error');
        } else {
          onToast('Microphone access is required for voice input.', 'error');
        }
      };

      recognition.onend = () => {
        setMicState('idle');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      console.error('Failed to start speech recognition:', e);
      setMicState('idle');
      onToast('Microphone access is required for voice input.', 'error');
    }
  };

  const handlePaste = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        onChange(clipText.slice(0, 5000));
        onToast('Text pasted from clipboard', 'info');
      }
    } catch (err) {
      onToast('Unable to read clipboard. Please paste manually.', 'error');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Translate on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (value.trim() && !isLoading) {
        onTranslate();
      }
    }
  };

  const maxChars = 5000;
  const charCount = value.length;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1E1D22] rounded-2xl border border-neutral-200/90 dark:border-neutral-800 shadow-sm transition-all focus-within:border-[#6842E8] focus-within:ring-2 focus-within:ring-[#6842E8]/15">
      {/* Top action header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 border-b border-neutral-100 dark:border-neutral-800/60">
        <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span>Source Input</span>
          {micState === 'recording' && (
            <span className="flex items-center gap-1.5 text-rose-500 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span>Listening…</span>
            </span>
          )}
          {micState === 'permission' && (
            <span className="flex items-center gap-1.5 text-[#6842E8] font-medium">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Allow microphone access…</span>
            </span>
          )}
          {micState === 'processing' && (
            <span className="flex items-center gap-1.5 text-[#6842E8] font-medium">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Processing voice…</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={onClear}
              className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-md transition-colors cursor-pointer"
              title="Clear input"
              aria-label="Clear input text"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={handlePaste}
            className="p-1.5 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-md transition-colors cursor-pointer"
            title="Paste text from clipboard"
            aria-label="Paste text from clipboard"
          >
            <Clipboard className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Textarea */}
      <div className="flex-1 p-4">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, maxChars))}
          onKeyDown={handleKeyDown}
          placeholder="Enter or paste text to translate... (Press Ctrl+Enter to translate)"
          rows={7}
          disabled={isLoading}
          className="w-full h-full min-h-[160px] resize-none bg-transparent text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 text-base leading-relaxed outline-none"
        />
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100 dark:border-neutral-800/60">
        <div className="flex items-center gap-2">
          {/* Microphone button */}
          <button
            type="button"
            onClick={startVoiceInput}
            disabled={!recognitionSupported || isLoading}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              micState === 'recording'
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 shadow-xs ring-2 ring-[#6842E8]/20'
                : micState === 'permission' || micState === 'processing'
                ? 'bg-[#EEE9FF] dark:bg-[#6842E8]/20 text-[#6842E8] dark:text-[#A78BFA] border border-[#6842E8]/30 shadow-xs'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/70 dark:hover:bg-neutral-700'
            } ${!recognitionSupported ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            title={
              !recognitionSupported
                ? 'Microphone speech recognition is not supported in this browser'
                : micState === 'recording'
                ? 'Click to stop listening'
                : 'Speak with voice'
            }
          >
            {micState === 'recording' ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <Mic className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                <span>Listening…</span>
              </>
            ) : micState === 'permission' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6842E8]" />
                <span>Allow microphone access…</span>
              </>
            ) : micState === 'processing' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6842E8]" />
                <span>Processing voice…</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-300" />
                <span>Voice</span>
              </>
            )}
          </button>

          {!recognitionSupported && (
            <span className="text-[11px] text-neutral-400 hidden sm:inline">
              Voice input unsupported
            </span>
          )}
        </div>

        {/* Character Counter */}
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-mono tabular-nums ${
              charCount >= maxChars
                ? 'text-rose-500 font-semibold'
                : 'text-neutral-400 dark:text-neutral-500'
            }`}
          >
            {charCount} / {maxChars}
          </span>
        </div>
      </div>
    </div>
  );
};
