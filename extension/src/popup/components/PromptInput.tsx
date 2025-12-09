import React, { useCallback, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from './ui/Button';
import { Textarea } from './ui/Textarea';
import { Spinner } from './ui/Spinner';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  error: string | null;
}

export const PromptInput: React.FC<PromptInputProps> = ({
  value,
  onChange,
  onSubmit,
  isLoading,
  error,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Cmd/Ctrl + Enter to submit
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isLoading && value.trim()) {
          onSubmit();
        }
      }
    },
    [isLoading, value, onSubmit]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoading && value.trim()) {
      onSubmit();
    }
  };

  const isMac = typeof navigator !== 'undefined' && navigator.platform?.includes('Mac');
  const shortcutHint = isMac ? '⌘+Return' : 'Ctrl+Enter';

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-black">Raw</h2>
      </div>

      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ramble..."
        aria-label="Raw prompt input"
        aria-describedby={error ? 'prompt-error' : undefined}
        style={{ height: '80px' }}
        disabled={isLoading}
      />

      <div className="flex justify-end items-center gap-2">
        <span className="text-xs text-gray-400">{shortcutHint}</span>
        <Button
          type="submit"
          size="sm"
          disabled={isLoading || !value.trim()}
          title={`Refactor prompt (${shortcutHint})`}
        >
          {isLoading ? <Spinner size={14} /> : <Send size={14} />}
          <span className="font-semibold">Refactor</span>
        </Button>
      </div>

      {error && (
        <div
          id="prompt-error"
          className="p-2 bg-red-50 border border-red-200 rounded text-red-600 text-xs"
          role="alert"
        >
          {error}
        </div>
      )}
    </form>
  );
};
