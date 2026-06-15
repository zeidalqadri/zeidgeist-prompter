import React, { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { Button } from './components/ui/Button';
import { Toast } from './components/ui/Toast';
import { PromptInput } from './components/PromptInput';
import { RefactoredOutput } from './components/RefactoredOutput';
import { HistoryPanel } from './components/HistoryPanel';
import { SettingsPanel, OpenWebAppButton } from './components/SettingsPanel';
import { useRefactor } from './hooks/useRefactor';
import { useHistory } from './hooks/useHistory';
import { useSettings } from './hooks/useSettings';

interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
}

const App: React.FC = () => {
  const { state, setRawPrompt, refactor, copyToClipboard, reset } = useRefactor();
  const { history, isLoading: historyLoading, removeFromHistory } = useHistory();
  const { settings, updateSettings } = useSettings();

  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: '',
    type: 'success',
  });

  const showToast = useCallback((message: string, type: ToastState['type'] = 'success') => {
    setToast({ show: true, message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, show: false }));
  }, []);

  const handleCopy = useCallback(async () => {
    await copyToClipboard();
    showToast('Replicated to clipboard!');
  }, [copyToClipboard, showToast]);

  const handleCopyText = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Replicated to clipboard!');
    } catch {
      showToast('Failed to copy', 'error');
    }
  }, [showToast]);

  const handleRepeat = useCallback(() => {
    // Set the refactored prompt as the new raw input for iteration
    setRawPrompt(state.refactoredPrompt);
  }, [setRawPrompt, state.refactoredPrompt]);

  const handleReuse = useCallback((refactored: string) => {
    setRawPrompt(refactored);
    showToast('Prompt loaded', 'info');
  }, [setRawPrompt, showToast]);

  const handleClearAll = useCallback(() => {
    reset();
  }, [reset]);

  const showClearButton = state.rawPrompt || state.refactoredPrompt;

  return (
    <div className="p-4 flex flex-col gap-4 min-h-[300px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight">
          <a
            href="https://mstprmpt.zeidgeist.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-black hover:text-gray-700 transition-colors"
          >
            mstprmpt
          </a>
          <span className="text-xs text-gray-500 ml-1 font-normal">v1.0.0</span>
        </h1>
        {showClearButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClearAll}
            title="Clear all"
            className="h-7 w-7"
          >
            <X size={14} />
          </Button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-4">
        {/* Raw Input */}
        <PromptInput
          value={state.rawPrompt}
          onChange={setRawPrompt}
          onSubmit={refactor}
          isLoading={state.isLoading}
          error={state.error}
        />

        {/* Refactored Output */}
        <RefactoredOutput
          result={state.refactoredPrompt}
          source={state.source}
          model={state.model}
          requestedProvider={state.requestedProvider}
          processingTime={state.processingTime}
          copied={state.copied}
          onCopy={handleCopy}
          onRepeat={handleRepeat}
        />

        {/* History Panel */}
        <HistoryPanel
          history={history}
          isLoading={historyLoading}
          onReuse={handleReuse}
          onCopy={handleCopyText}
          onRemove={removeFromHistory}
        />

        {/* Settings Panel */}
        <SettingsPanel
          settings={settings}
          onUpdate={updateSettings}
        />
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 pt-3">
        <OpenWebAppButton />
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </div>
  );
};

export default App;
