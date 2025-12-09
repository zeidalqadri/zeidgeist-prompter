import React, { useState } from 'react';
import { ChevronDown, ChevronUp, RotateCw, Copy, Trash2 } from 'lucide-react';
import { Button } from './ui/Button';
import type { HistoryItem } from '@/shared/types';

interface HistoryPanelProps {
  history: HistoryItem[];
  isLoading: boolean;
  onReuse: (refactored: string) => void;
  onCopy: (text: string) => void;
  onRemove: (id: string) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  isLoading,
  onReuse,
  onCopy,
  onRemove,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleItemExpanded = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const truncate = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="border-t border-gray-200 pt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left hover:bg-gray-50 rounded p-1 -m-1"
        aria-expanded={isExpanded}
      >
        <span className="text-sm font-semibold text-black">
          Recollect ({history.length})
        </span>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-2 max-h-[200px] overflow-y-auto">
          {isLoading ? (
            <div className="text-xs text-gray-500 text-center py-4">Loading...</div>
          ) : history.length === 0 ? (
            <div className="text-xs text-gray-500 text-center py-4">No history yet</div>
          ) : (
            history.slice(0, 10).map((item) => (
              <div
                key={item.id}
                className="bg-gray-50 rounded border border-gray-200 p-2 text-xs"
              >
                <div
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() => toggleItemExpanded(item.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-500 mb-1">{formatTime(item.timestamp)}</div>
                    <div className="text-black truncate">
                      {truncate(item.refactored, 60)}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        onReuse(item.refactored);
                      }}
                      title="Reuse this prompt"
                    >
                      <RotateCw size={12} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCopy(item.refactored);
                      }}
                      title="Replicate to clipboard"
                    >
                      <Copy size={12} />
                    </Button>
                  </div>
                </div>

                {expandedItems.has(item.id) && (
                  <div className="mt-2 pt-2 border-t border-gray-200 space-y-2">
                    <div>
                      <div className="text-gray-500 font-medium">Raw:</div>
                      <div className="text-black bg-white p-1 rounded mt-1">
                        {item.original}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 font-medium">Refactored:</div>
                      <div className="text-black bg-white p-1 rounded mt-1">
                        {item.refactored}
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(item.id);
                        }}
                        title="Remove from history"
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
