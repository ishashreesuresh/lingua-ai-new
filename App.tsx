import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeftRight,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  LanguageCode,
  SourceLanguageCode,
  TranslationMode,
  HistoryItem,
  FavoriteItem,
  SUPPORTED_LANGUAGES,
} from './types';
import { Header } from './components/Header';
import { LanguageSelector } from './components/LanguageSelector';
import { ModeSelector } from './components/ModeSelector';
import { TranslationInput } from './components/TranslationInput';
import { TranslationOutput } from './components/TranslationOutput';
import { AITranslationBridge } from './components/AITranslationBridge';
import { PronunciationCard } from './components/PronunciationCard';
import { AIAssistPanel } from './components/AIAssistPanel';
import { HistoryDrawer } from './components/HistoryDrawer';
import { FavoritesDrawer } from './components/FavoritesDrawer';
import { LanguagesGuideModal } from './components/LanguagesGuideModal';
import { GoogleDriveModal } from './components/GoogleDriveModal';
import { Toast, ToastMessage } from './components/Toast';
import { User } from 'firebase/auth';
import { initAuth } from './services/firebaseAuth';

const STORAGE_KEY_HISTORY = 'lingua_ai_history_v1';
const STORAGE_KEY_SAVED = 'linguaai_saved_translations';
const STORAGE_KEY_THEME = 'lingua_ai_theme_v1';

export interface ActiveTranslationRecord {
  originalText: string;
  translatedText: string;
  sourceLanguage: SourceLanguageCode;
  targetLanguage: LanguageCode;
  timestamp: number;
}

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {}
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Core translation state
  const [sourceLanguage, setSourceLanguage] = useState<SourceLanguageCode>('auto');
  const [targetLanguage, setTargetLanguage] = useState<LanguageCode>('ta');
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState<LanguageCode | undefined>(undefined);
  const [mode, setMode] = useState<TranslationMode>('Translate');

  // Active translation record for saving
  const [activeTranslation, setActiveTranslation] = useState<ActiveTranslationRecord | null>(null);

  // Status & states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buttonState, setButtonState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Pronunciation & AI assistance
  const [pronunciation, setPronunciation] = useState<string | null>(null);
  const [isLoadingPronunciation, setIsLoadingPronunciation] = useState(false);

  // History & Saved Translations
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => {
    try {
      const saved =
        localStorage.getItem(STORAGE_KEY_SAVED) ||
        localStorage.getItem('lingua_ai_favorites_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modals & Drawers
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isLanguagesGuideOpen, setIsLanguagesGuideOpen] = useState(false);
  const [isGoogleDriveOpen, setIsGoogleDriveOpen] = useState(false);

  // Google Drive & Auth state (in-memory token, no localStorage token)
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Initialize Auth state listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (authedUser, token) => {
        setUser(authedUser);
        setAccessToken(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Toast feedback
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setToast({ id: Math.random().toString(), message, type });
  };

  // Sync theme to root class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    try {
      localStorage.setItem(STORAGE_KEY_THEME, theme);
    } catch {}
  }, [theme]);

  // Save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    } catch (e) {
      console.warn('Failed to save history to storage', e);
    }
  }, [history]);

  // Save saved translations to localStorage using dedicated key linguaai_saved_translations
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(favorites));
    } catch (e) {
      console.warn('Failed to save favorites to storage', e);
    }
  }, [favorites]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      const root = document.documentElement;
      if (next === 'dark') {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
      try {
        localStorage.setItem(STORAGE_KEY_THEME, next);
      } catch {}
      return next;
    });
  };

  // Auto-detect language if source is 'auto' and text length >= 4
  useEffect(() => {
    if (sourceLanguage !== 'auto' || !inputText.trim() || inputText.trim().length < 4) {
      if (sourceLanguage !== 'auto') {
        setDetectedLanguage(undefined);
      }
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: inputText }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.detectedLanguage) {
            setDetectedLanguage(data.detectedLanguage);
          }
        }
      } catch (err) {
        // Silent catch for background detection
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [inputText, sourceLanguage]);

  // Main Translation Action
  const handleTranslate = useCallback(async () => {
    const textToTranslate = inputText.trim();
    if (!textToTranslate) {
      showToast('Please enter text to translate', 'info');
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    setError(null);
    setButtonState('loading');
    setPronunciation(null);

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToTranslate,
          sourceLanguage,
          targetLanguage,
          mode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Translation request failed.');
      }

      const data = await response.json();
      const resultText = data.translatedText || '';

      setTranslatedText(resultText);
      if (data.detectedLanguage) {
        setDetectedLanguage(data.detectedLanguage);
      }

      setButtonState('success');
      setTimeout(() => setButtonState('idle'), 2500);

      const effectiveSource =
        sourceLanguage === 'auto'
          ? (data.detectedLanguage || 'auto')
          : sourceLanguage;

      // Active translation ready to be explicitly saved by user (does NOT auto-save)
      setActiveTranslation({
        originalText: textToTranslate,
        translatedText: resultText,
        sourceLanguage: effectiveSource,
        targetLanguage,
        timestamp: Date.now(),
      });

      // Save to recent history (max 20)
      const newHistoryItem: HistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        sourceLanguage,
        targetLanguage,
        originalText: textToTranslate,
        translatedText: resultText,
        timestamp: Date.now(),
        detectedLanguage: data.detectedLanguage,
      };

      setHistory((prev) => [newHistoryItem, ...prev.filter((h) => h.originalText !== textToTranslate)].slice(0, 20));

      // Auto-fetch pronunciation for Asian & Indian languages where transliteration adds huge value
      if (['ja', 'ta', 'hi', 'ml', 'te', 'kn'].includes(targetLanguage) && resultText.length < 300) {
        fetchPronunciation(resultText, targetLanguage);
      }
    } catch (err: any) {
      console.error('Translation error:', err);
      setError(err.message || 'Translation unavailable');
      setActiveTranslation(null);
      setButtonState('error');
      setTimeout(() => setButtonState('idle'), 3000);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, sourceLanguage, targetLanguage, mode, isLoading]);

  // Fetch Pronunciation assistance
  const fetchPronunciation = async (text: string, lang: LanguageCode) => {
    setIsLoadingPronunciation(true);
    try {
      const res = await fetch('/api/pronunciation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: lang }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.pronunciation) {
          setPronunciation(data.pronunciation);
        }
      }
    } catch {
      // Non-critical feature
    } finally {
      setIsLoadingPronunciation(false);
    }
  };

  // Language Swap logic
  const handleSwapLanguages = () => {
    let newSource: SourceLanguageCode;
    let newTarget: LanguageCode;

    if (sourceLanguage === 'auto') {
      newSource = targetLanguage;
      newTarget = detectedLanguage || 'en';
    } else {
      newSource = targetLanguage;
      newTarget = sourceLanguage as LanguageCode;
    }

    setSourceLanguage(newSource);
    setTargetLanguage(newTarget);
    setDetectedLanguage(undefined);

    // Swap text if translated output exists
    if (translatedText && inputText) {
      const prevInput = inputText;
      const prevTranslated = translatedText;
      setInputText(prevTranslated);
      setTranslatedText(prevInput);
      setActiveTranslation({
        originalText: prevTranslated,
        translatedText: prevInput,
        sourceLanguage: newSource,
        targetLanguage: newTarget,
        timestamp: Date.now(),
      });
    }
    setPronunciation(null);
  };

  // Check if active translation is already saved in Saved Translations
  const isCurrentFavorited = useMemo(() => {
    if (!translatedText.trim() || !inputText.trim()) return false;
    const orig = (activeTranslation ? activeTranslation.originalText : inputText).trim();
    const trans = (activeTranslation ? activeTranslation.translatedText : translatedText).trim();
    const src = activeTranslation ? activeTranslation.sourceLanguage : sourceLanguage;
    const tgt = activeTranslation ? activeTranslation.targetLanguage : targetLanguage;

    return favorites.some(
      (f) =>
        f.originalText.trim().toLowerCase() === orig.toLowerCase() &&
        f.translatedText.trim() === trans &&
        f.sourceLanguage === src &&
        f.targetLanguage === tgt
    );
  }, [favorites, activeTranslation, inputText, translatedText, sourceLanguage, targetLanguage]);

  // Save translation action (prevents duplicates, saves complete record)
  const toggleFavorite = () => {
    if (!translatedText.trim() || !inputText.trim() || isLoading || !!error) {
      showToast('No translation to save', 'info');
      return;
    }

    const orig = (activeTranslation ? activeTranslation.originalText : inputText).trim();
    const trans = (activeTranslation ? activeTranslation.translatedText : translatedText).trim();
    const src = activeTranslation ? activeTranslation.sourceLanguage : sourceLanguage;
    const tgt = activeTranslation ? activeTranslation.targetLanguage : targetLanguage;

    // Check if duplicate already exists
    const isAlreadySaved = favorites.some(
      (f) =>
        f.originalText.trim().toLowerCase() === orig.toLowerCase() &&
        f.translatedText.trim() === trans &&
        f.sourceLanguage === src &&
        f.targetLanguage === tgt
    );

    if (isAlreadySaved) {
      showToast('Already saved', 'info');
      return;
    }

    const newSavedItem: FavoriteItem = {
      id: 'saved_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      sourceLanguage: src,
      targetLanguage: tgt,
      originalText: orig,
      translatedText: trans,
      timestamp: Date.now(),
    };

    const nextList = [newSavedItem, ...favorites];
    setFavorites(nextList);
    try {
      localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(nextList));
    } catch (e) {
      console.warn('Failed to save to localStorage', e);
    }
    showToast('✓ Saved', 'success');
  };

  // Remove single item from saved translations
  const handleRemoveFavorite = (id: string) => {
    const nextList = favorites.filter((f) => f.id !== id);
    setFavorites(nextList);
    try {
      localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(nextList));
    } catch (e) {
      console.warn('Failed to update saved translations', e);
    }
    showToast('Saved translation removed', 'info');
  };

  // Restore translation from history or favorites
  const restoreTranslation = (item: {
    sourceLanguage: SourceLanguageCode;
    targetLanguage: LanguageCode;
    originalText: string;
    translatedText: string;
    timestamp?: number;
  }) => {
    setSourceLanguage(item.sourceLanguage);
    setTargetLanguage(item.targetLanguage);
    setInputText(item.originalText);
    setTranslatedText(item.translatedText);
    setError(null);
    setPronunciation(null);
    setActiveTranslation({
      originalText: item.originalText,
      translatedText: item.translatedText,
      sourceLanguage: item.sourceLanguage,
      targetLanguage: item.targetLanguage,
      timestamp: item.timestamp || Date.now(),
    });
    showToast('Loaded into translator', 'info');
  };

  return (
    <div className="min-h-screen bg-[#F8F6F1] dark:bg-[#171619] text-neutral-900 dark:text-neutral-100 transition-colors flex flex-col selection:bg-[#6842E8]/20 selection:text-[#6842E8]">
      {/* Header */}
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenFavorites={() => setIsFavoritesOpen(true)}
        onOpenLanguagesGuide={() => setIsLanguagesGuideOpen(true)}
        onOpenGoogleDrive={() => setIsGoogleDriveOpen(true)}
        user={user}
        historyCount={history.length}
        favoritesCount={favorites.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        {/* Hero & Product Introduction */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-neutral-200/80 dark:border-neutral-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#6842E8] dark:text-[#A78BFA] uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Multilingual Intelligence Platform</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 text-balance">
              Translate with nuance, voice, and context.
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Accurate neural translation supporting 10 languages with native text-to-speech and speech input.
            </p>
          </div>

          {/* Quick Guide Trigger */}
          <button
            type="button"
            onClick={() => setIsLanguagesGuideOpen(true)}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-medium text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#6842E8]" />
            <span>Language Matrix & Samples</span>
          </button>
        </div>

        {/* Translation Workspace */}
        <section id="workspace" className="space-y-4">
          {/* Language Selection Bar & Swap */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-[#1E1D22] border border-neutral-200/90 dark:border-neutral-800 shadow-xs">
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              {/* Source Language */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-neutral-400 font-medium hidden sm:inline">From:</span>
                <LanguageSelector
                  type="source"
                  value={sourceLanguage}
                  onChange={(val) => {
                    setSourceLanguage(val);
                    setPronunciation(null);
                  }}
                  detectedLanguage={detectedLanguage}
                  disabled={isLoading}
                />
              </div>

              {/* Swap Button */}
              <button
                type="button"
                onClick={handleSwapLanguages}
                disabled={isLoading}
                className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-[#6842E8] hover:text-[#6842E8] text-neutral-600 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-900/80 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Swap source and target languages"
                aria-label="Swap source and target languages"
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>

              {/* Target Language */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-neutral-400 font-medium hidden sm:inline">To:</span>
                <LanguageSelector
                  type="target"
                  value={targetLanguage}
                  onChange={(val) => {
                    if (val !== 'auto') {
                      setTargetLanguage(val);
                      setPronunciation(null);
                    }
                  }}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Translation Mode Selector */}
            <ModeSelector
              currentMode={mode}
              onSelectMode={(newMode) => setMode(newMode)}
              disabled={isLoading}
            />
          </div>

          {/* Main Translation Workspace: Responsive Layout with Center AI Translation Bridge */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-4">
            {/* Input Panel */}
            <div className="min-h-[300px] h-full">
              <TranslationInput
                value={inputText}
                onChange={(val) => {
                  setInputText(val);
                  if (!val.trim()) {
                    setTranslatedText('');
                    setPronunciation(null);
                    setError(null);
                    setActiveTranslation(null);
                  }
                }}
                onTranslate={handleTranslate}
                onClear={() => {
                  setInputText('');
                  setTranslatedText('');
                  setPronunciation(null);
                  setError(null);
                  setActiveTranslation(null);
                }}
                isLoading={isLoading}
                sourceLanguage={sourceLanguage}
                detectedLanguage={detectedLanguage}
                onToast={showToast}
              />
            </div>

            {/* Center AI Translation Bridge */}
            <AITranslationBridge
              onTranslate={handleTranslate}
              isLoading={isLoading}
              buttonState={buttonState}
              disabled={isLoading || !inputText.trim()}
              sourceLanguage={sourceLanguage}
              targetLanguage={targetLanguage}
              detectedLanguage={detectedLanguage}
            />

            {/* Output Panel */}
            <div className="min-h-[300px] h-full flex flex-col gap-3">
              <TranslationOutput
                translatedText={translatedText}
                targetLanguage={targetLanguage}
                isLoading={isLoading}
                error={error}
                onRetry={handleTranslate}
                isFavorited={isCurrentFavorited}
                onToggleFavorite={toggleFavorite}
                onToast={showToast}
                onRequestPronunciation={() => fetchPronunciation(translatedText, targetLanguage)}
                onSaveToDrive={() => setIsGoogleDriveOpen(true)}
              />

              {/* Pronunciation Card (if available) */}
              {pronunciation && (
                <PronunciationCard
                  pronunciation={pronunciation}
                  language={targetLanguage}
                  onClose={() => setPronunciation(null)}
                  onToast={showToast}
                />
              )}
            </div>
          </div>
        </section>

        {/* AI Assist Module */}
        <AIAssistPanel
          originalText={inputText}
          translatedText={translatedText}
          sourceLanguage={sourceLanguage}
          targetLanguage={targetLanguage}
          onApplyAssistedText={(newText) => setTranslatedText(newText)}
          onToast={showToast}
        />
      </main>

      {/* Drawers and Modals */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelect={restoreTranslation}
        onDelete={(id) => {
          setHistory((prev) => prev.filter((h) => h.id !== id));
          showToast('History item removed', 'info');
        }}
        onClearAll={() => {
          setHistory([]);
          showToast('Translation history cleared', 'info');
        }}
        onToast={showToast}
      />

      <FavoritesDrawer
        isOpen={isFavoritesOpen}
        onClose={() => setIsFavoritesOpen(false)}
        favorites={favorites}
        onSelect={restoreTranslation}
        onRemove={handleRemoveFavorite}
        onToast={showToast}
      />

      <LanguagesGuideModal
        isOpen={isLanguagesGuideOpen}
        onClose={() => setIsLanguagesGuideOpen(false)}
        onSelectPair={(from, to, sample) => {
          setSourceLanguage(from);
          setTargetLanguage(to);
          if (sample) {
            setInputText(sample);
            setTranslatedText('');
            setPronunciation(null);
          }
        }}
      />

      {/* Google Drive Integration Modal */}
      <GoogleDriveModal
        isOpen={isGoogleDriveOpen}
        onClose={() => setIsGoogleDriveOpen(false)}
        user={user}
        accessToken={accessToken}
        onAuthSuccess={(authedUser, token) => {
          setUser(authedUser);
          setAccessToken(token);
        }}
        onAuthLogout={() => {
          setUser(null);
          setAccessToken(null);
        }}
        currentOriginalText={inputText}
        currentTranslatedText={translatedText}
        sourceLanguage={sourceLanguage}
        targetLanguage={targetLanguage}
        pronunciation={pronunciation}
        history={history}
        favorites={favorites}
        onLoadTextIntoTranslator={(text) => {
          setInputText(text);
          setTranslatedText('');
          setPronunciation(null);
        }}
        onToast={showToast}
      />

      {/* Toast Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Footer */}
      <footer className="mt-auto border-t border-neutral-200 dark:border-neutral-800/80 bg-white/40 dark:bg-neutral-900/40 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-neutral-800 dark:text-neutral-200">LinguaAI</span>
            <span>·</span>
            <span>Multilingual Language Intelligence</span>
          </div>

          <div className="flex items-center gap-4">
            <span>10 Languages Supported</span>
            <span>·</span>
            <span>Neural Speech Synthesis</span>
            <span>·</span>
            <span>Groq & Gemini Core</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
