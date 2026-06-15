import React from 'react';
import { Copy, Check, Zap, Clock, RotateCw } from 'lucide-react';
import { Button } from './ui/Button';

interface RefactoredOutputProps {
  result: string;
  source: string | null;
  model: string | null;
  requestedProvider: string | null;
  processingTime: number | null;
  copied: boolean;
  onCopy: () => void;
  onRepeat: () => void;
}

export const RefactoredOutput: React.FC<RefactoredOutputProps> = ({
  result,
  source,
  model,
  requestedProvider,
  processingTime,
  copied,
  onCopy,
  onRepeat,
}) => {
  if (!result) return null;

  return (
    <div className="space-y-2 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-black">Refactored</h2>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onCopy}
            title="Replicate to clipboard"
            className="h-7 w-7"
          >
            {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
          </Button>
        </div>
      </div>

      <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm text-black whitespace-pre-wrap font-medium max-h-[150px] overflow-y-auto">
        {result}
      </div>

      {/* Metadata display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {source && (
            <div className="flex items-center gap-1">
              <Zap size={12} />
              <span>
                {source === 'external-api' ? 'AI' : source}
                {model ? ` · ${model}` : ''}
                {requestedProvider && requestedProvider !== source
                  ? ` (req: ${requestedProvider})`
                  : ''}
              </span>
            </div>
          )}
          {processingTime !== null && (
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>{processingTime}ms</span>
            </div>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onRepeat}
          className="h-7"
          title="Repeat (iterate on result)"
        >
          <RotateCw size={12} />
          <span>Repeat</span>
        </Button>
      </div>
    </div>
  );
};
