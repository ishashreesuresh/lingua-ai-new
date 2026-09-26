import React, { useState, useEffect } from 'react';
import {
  X,
  HardDrive,
  FileText,
  Search,
  Upload,
  Download,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  LogOut,
  FolderOpen,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  DriveFileItem,
  listDriveFiles,
  getDriveFileText,
  uploadDriveTextFile,
  deleteDriveFile,
} from '../services/googleDrive';
import { googleSignIn, logout } from '../services/firebaseAuth';
import { HistoryItem, FavoriteItem, SUPPORTED_LANGUAGES, LanguageCode } from '../types';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  accessToken: string | null;
  onAuthSuccess: (user: User, token: string) => void;
  onAuthLogout: () => void;
  currentOriginalText: string;
  currentTranslatedText: string;
  sourceLanguage: string;
  targetLanguage: LanguageCode;
  pronunciation?: string | null;
  history: HistoryItem[];
  favorites: FavoriteItem[];
  onLoadTextIntoTranslator: (text: string) => void;
  onToast: (msg: string, type?: 'info' | 'error' | 'success') => void;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  user,
  accessToken,
  onAuthSuccess,
  onAuthLogout,
  currentOriginalText,
  currentTranslatedText,
  sourceLanguage,
  targetLanguage,
  pronunciation,
  history,
  favorites,
  onLoadTextIntoTranslator,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'save' | 'backup'>('save');
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Browse state
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);

  // Save state
  const [saveFileName, setSaveFileName] = useState('');
  const [includeOriginal, setIncludeOriginal] = useState(true);
  const [includePronunciation, setIncludePronunciation] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedFileResult, setSavedFileResult] = useState<{ id: string; name: string; link?: string } | null>(null);

  // Destructive delete confirmation modal state
  const [fileToDelete, setFileToDelete] = useState<DriveFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Default file name when tab opens
  useEffect(() => {
    if (isOpen) {
      const now = new Date().toISOString().slice(0, 10);
      const targetName = SUPPORTED_LANGUAGES[targetLanguage]?.name || targetLanguage;
      setSaveFileName(`LinguaAI - Translation to ${targetName} - ${now}.txt`);
      setSavedFileResult(null);
    }
  }, [isOpen, targetLanguage]);

  // Load files when tab changes to 'import' and user is logged in
  useEffect(() => {
    if (isOpen && user && accessToken && activeTab === 'import') {
      fetchFiles();
    }
  }, [isOpen, user, accessToken, activeTab]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        onAuthSuccess(res.user, res.accessToken);
        onToast('Connected to Google Drive successfully', 'success');
      }
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      onToast(err.message || 'Google sign-in failed. Please try again.', 'error');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    onAuthLogout();
    setFiles([]);
    onToast('Signed out of Google Drive', 'info');
  };

  const fetchFiles = async () => {
    if (!accessToken) return;
    setIsLoadingFiles(true);
    try {
      const driveFiles = await listDriveFiles(accessToken, searchQuery);
      setFiles(driveFiles);
    } catch (err: any) {
      console.error('Failed to list files:', err);
      onToast('Could not load Google Drive files. Please try again.', 'error');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleImportFile = async (file: DriveFileItem) => {
    if (!accessToken) return;
    setLoadingFileId(file.id);
    try {
      const content = await getDriveFileText(accessToken, file.id, file.mimeType);
      if (!content || !content.trim()) {
        onToast('The selected file appears to be empty.', 'info');
        return;
      }
      onLoadTextIntoTranslator(content.slice(0, 5000));
      onToast(`Imported "${file.name}" into editor`, 'success');
      onClose();
    } catch (err: any) {
      console.error('Failed to read file:', err);
      onToast('Failed to import file content from Google Drive.', 'error');
    } finally {
      setLoadingFileId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!accessToken || !fileToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDriveFile(accessToken, fileToDelete.id);
      setFiles((prev) => prev.filter((f) => f.id !== fileToDelete.id));
      onToast(`Deleted "${fileToDelete.name}" from Google Drive`, 'info');
      setFileToDelete(null);
    } catch (err: any) {
      console.error('Delete failed:', err);
      onToast('Could not delete file from Google Drive.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveTranslation = async () => {
    if (!accessToken) return;
    if (!currentTranslatedText.trim()) {
      onToast('No translated text to save. Please translate something first.', 'info');
      return;
    }

    setIsSaving(true);
    setSavedFileResult(null);

    try {
      const srcName = SUPPORTED_LANGUAGES[sourceLanguage as LanguageCode]?.name || sourceLanguage;
      const tgtName = SUPPORTED_LANGUAGES[targetLanguage]?.name || targetLanguage;

      let fileBody = `======================================================\n`;
      fileBody += `LinguaAI Translation Document\n`;
      fileBody += `Date: ${new Date().toLocaleString()}\n`;
      fileBody += `Direction: ${srcName} -> ${tgtName}\n`;
      fileBody += `======================================================\n\n`;

      if (includeOriginal && currentOriginalText.trim()) {
        fileBody += `[Original Text - ${srcName}]\n`;
        fileBody += `${currentOriginalText}\n\n`;
        fileBody += `------------------------------------------------------\n\n`;
      }

      fileBody += `[Translation - ${tgtName}]\n`;
      fileBody += `${currentTranslatedText}\n\n`;

      if (includePronunciation && pronunciation) {
        fileBody += `------------------------------------------------------\n\n`;
        fileBody += `[Pronunciation Guide]\n`;
        fileBody += `${pronunciation}\n\n`;
      }

      fileBody += `======================================================\n`;
      fileBody += `Generated by LinguaAI Multilingual Platform\n`;

      const result = await uploadDriveTextFile(accessToken, {
        fileName: saveFileName.trim() || 'LinguaAI-Translation.txt',
        content: fileBody,
      });

      setSavedFileResult({
        id: result.id,
        name: result.name,
        link: result.webViewLink,
      });
      onToast('Translation saved to your Google Drive!', 'success');
    } catch (err: any) {
      console.error('Save to Drive error:', err);
      onToast('Failed to save file to Google Drive. Please retry.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackupExport = async (type: 'history' | 'favorites') => {
    if (!accessToken) return;
    const items = type === 'history' ? history : favorites;
    if (items.length === 0) {
      onToast(`No ${type} entries to export`, 'info');
      return;
    }

    setIsSaving(true);
    try {
      const fileName = `LinguaAI-${type}-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const content = JSON.stringify(items, null, 2);

      const res = await uploadDriveTextFile(accessToken, {
        fileName,
        content,
        mimeType: 'application/json',
        description: `LinguaAI ${type} backup export`,
      });

      onToast(`Exported ${items.length} ${type} items to Google Drive!`, 'success');
      setSavedFileResult({
        id: res.id,
        name: res.name,
        link: res.webViewLink,
      });
    } catch (err: any) {
      onToast(`Failed to export ${type} to Google Drive.`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-neutral-900/40 dark:bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-[#1A191E] border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#EEE9FF] dark:bg-[#6842E8]/20 text-[#6842E8] flex items-center justify-center shadow-xs">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <span>Google Drive Integration</span>
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Save translations, export backups, and import documents from your Drive
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

          {/* User Sign-in Status Card */}
          <div className="my-4 p-3.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Google user'}
                    className="w-8 h-8 rounded-full border border-neutral-300 dark:border-neutral-700 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#6842E8] text-white flex items-center justify-center font-bold text-xs">
                    {user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                    {user.displayName || 'Google Account'}
                  </div>
                  <div className="text-[11px] text-neutral-500 font-mono">
                    {user.email}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-neutral-600 dark:text-neutral-400">
                Connect your Google account to read, save, and export files to Google Drive with your permission.
              </div>
            )}

            <div>
              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-rose-500 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              ) : (
                /* Google Sign In Button styled as official standard button */
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={isSigningIn}
                  className="inline-flex items-center gap-2.5 px-4 py-2 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/80 text-xs font-semibold text-neutral-800 dark:text-neutral-100 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSigningIn ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#6842E8]" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Sign in with Google</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          {user && (
            <div className="flex items-center gap-1 border-b border-neutral-200 dark:border-neutral-800 pb-2 mb-4">
              <button
                type="button"
                onClick={() => setActiveTab('save')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'save'
                    ? 'bg-[#6842E8] text-white'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                Save Translation
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('import')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'import'
                    ? 'bg-[#6842E8] text-white'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                Browse & Import
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('backup')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeTab === 'backup'
                    ? 'bg-[#6842E8] text-white'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                Backups
              </button>
            </div>
          )}

          {/* Content Area */}
          {!user ? (
            <div className="py-8 text-center space-y-3">
              <FolderOpen className="w-12 h-12 stroke-1 text-neutral-400 mx-auto" />
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Google Drive Authentication Required
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mt-1">
                  Sign in with Google above to grant permission to access your Drive files directly from LinguaAI.
                </p>
              </div>
            </div>
          ) : activeTab === 'save' ? (
            /* TAB 1: SAVE TRANSLATION */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  File Name
                </label>
                <input
                  type="text"
                  value={saveFileName}
                  onChange={(e) => setSaveFileName(e.target.value)}
                  placeholder="translation-document.txt"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 outline-none focus:ring-1 focus:ring-[#6842E8]"
                />
              </div>

              <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 space-y-2">
                <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 block">
                  Include in Document:
                </span>
                <label className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeOriginal}
                    onChange={(e) => setIncludeOriginal(e.target.checked)}
                    className="rounded text-[#6842E8] focus:ring-[#6842E8]"
                  />
                  <span>Original Source Text ({currentOriginalText.length} characters)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includePronunciation}
                    onChange={(e) => setIncludePronunciation(e.target.checked)}
                    className="rounded text-[#6842E8] focus:ring-[#6842E8]"
                  />
                  <span>Pronunciation Guide (if available)</span>
                </label>
              </div>

              {/* Preview */}
              <div>
                <span className="text-xs font-semibold text-neutral-500 block mb-1">
                  Translation Preview:
                </span>
                <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/70 dark:bg-neutral-900/80 text-xs text-neutral-800 dark:text-neutral-200 max-h-32 overflow-y-auto font-mono whitespace-pre-wrap">
                  {currentTranslatedText || '(No translation output available yet)'}
                </div>
              </div>

              {/* Save Button & Result */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleSaveTranslation}
                  disabled={isSaving || !currentTranslatedText.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#6842E8] hover:bg-[#5833d1] text-white text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to Drive...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Save to Google Drive</span>
                    </>
                  )}
                </button>

                {savedFileResult && (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Saved!</span>
                    {savedFileResult.link && (
                      <a
                        href={savedFileResult.link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 underline font-medium hover:text-emerald-700"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'import' ? (
            /* TAB 2: BROWSE & IMPORT FILES */
            <div className="space-y-3">
              {/* Search & Refresh */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchFiles()}
                    placeholder="Search files in your Google Drive..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 outline-none focus:ring-1 focus:ring-[#6842E8]"
                  />
                </div>
                <button
                  type="button"
                  onClick={fetchFiles}
                  disabled={isLoadingFiles}
                  className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
                  title="Refresh Drive files"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* File list */}
              <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
                {isLoadingFiles ? (
                  <div className="py-8 text-center text-xs text-neutral-400 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-[#6842E8]" />
                    <span>Loading your Google Drive files...</span>
                  </div>
                ) : files.length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-400">
                    No files found in Google Drive
                  </div>
                ) : (
                  files.map((file) => (
                    <div
                      key={file.id}
                      className="p-2.5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-900/60 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 truncate mr-3">
                        <FileText className="w-4 h-4 text-[#6842E8] shrink-0" />
                        <div className="truncate">
                          <div className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">
                            {file.name}
                          </div>
                          <div className="text-[10px] text-neutral-400 font-mono">
                            {file.modifiedTime?.slice(0, 10)} · {file.mimeType.split('.').pop()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Import / Load Button */}
                        <button
                          type="button"
                          onClick={() => handleImportFile(file)}
                          disabled={loadingFileId === file.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-[#EEE9FF] dark:bg-[#6842E8]/20 text-[#6842E8] dark:text-[#A78BFA] hover:bg-[#e1d8ff] rounded-md transition-colors cursor-pointer"
                        >
                          {loadingFileId === file.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Download className="w-3 h-3" />
                          )}
                          <span>Translate</span>
                        </button>

                        {/* Open externally */}
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                            title="Open in Drive"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {/* Delete button (opens confirmation dialog!) */}
                        <button
                          type="button"
                          onClick={() => setFileToDelete(file)}
                          className="p-1 text-neutral-400 hover:text-rose-500 transition-colors cursor-pointer"
                          title="Delete file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* TAB 3: BACKUPS */
            <div className="space-y-4">
              <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40">
                <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                  Cloud Backup to Google Drive
                </h4>
                <p className="text-xs text-neutral-500 leading-relaxed mb-3">
                  Export your local translation history and saved favorites as structured JSON backup files to Google Drive so you never lose your translations.
                </p>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleBackupExport('history')}
                    disabled={isSaving || history.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-lg hover:border-[#6842E8] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#6842E8]" />
                    <span>Backup History ({history.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBackupExport('favorites')}
                    disabled={isSaving || favorites.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-lg hover:border-amber-500 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-500" />
                    <span>Backup Saved ({favorites.length})</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* User Confirmation Dialog for Destructive Operations (MANDATORY REQUIREMENT) */}
          {fileToDelete && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <div className="w-full max-w-sm rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      Delete File from Google Drive?
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                      Are you sure you want to permanently delete <strong className="text-neutral-800 dark:text-neutral-200">"{fileToDelete.name}"</strong> from your Google Drive? This action cannot be undone.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setFileToDelete(null)}
                    disabled={isDeleting}
                    className="px-3 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Delete File</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
