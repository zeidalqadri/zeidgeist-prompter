"use client"

import React from "react"

import { useState, useEffect, useCallback, useReducer, useMemo, memo } from "react"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { VisibleTextarea } from "./ui/visible-textarea"
import { Loader2, Send, Copy, Check, Info, X, ChevronDown, ChevronUp, RotateCw, Zap, Clock } from "lucide-react"
import FeedbackForm from "./feedback-form"

// Create a simple inline toast component
const SimpleToast = memo(({ show, message }: { show: boolean, message: string }) => {
  if (!show) return null;
  return (
    <div 
      role="status" 
      aria-live="polite" 
      className="fixed bottom-4 right-4 bg-gray-800 text-white py-2 px-4 rounded-md shadow-lg transition-opacity duration-300"
    >
      {message}
    </div>
  );
});

SimpleToast.displayName = 'SimpleToast';

// Memoized history table row component
const HistoryRow = memo(({ 
  item, 
  index, 
  isExpanded, 
  onToggleExpand, 
  onUsePrompt, 
  onCopyToClipboard, 
  formatTime 
}: {
  item: PromptHistoryItem;
  index: number;
  isExpanded: boolean;
  onToggleExpand: (index: number) => void;
  onUsePrompt: (refined: string) => void;
  onCopyToClipboard: (text: string) => void;
  formatTime: (date: Date) => string;
}) => {
  const handleToggle = useCallback(() => onToggleExpand(index), [onToggleExpand, index]);
  const handleUse = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onUsePrompt(item.refined);
  }, [onUsePrompt, item.refined]);
  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onCopyToClipboard(item.refined);
  }, [onCopyToClipboard, item.refined]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  }, [handleToggle]);

  return (
    <React.Fragment>
      <tr 
        className={index % 2 === 0 ? "bg-white hover:bg-gray-50 border-b border-gray-200" : "bg-gray-50 hover:bg-gray-100 border-b border-gray-200"}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} history item from ${formatTime(item.timestamp)}`}
      >
        <td className="px-3 py-2 align-top whitespace-nowrap text-black">{formatTime(item.timestamp)}</td>
        <td className="px-3 py-2 align-top">
          <div className="max-w-[150px] truncate cursor-help text-black" title={item.original}>
            {item.original.substring(0, 50)}
            {item.original.length > 50 ? "..." : ""}
          </div>
          {item.context && (
            <div className="mt-1 text-black font-medium italic max-w-[150px] truncate cursor-help" title={item.context}>
              Related: {item.context.substring(0, 30)}
              {item.context.length > 30 ? "..." : ""}
            </div>
          )}
        </td>
        <td className="px-3 py-2 align-top">
          <div className="max-w-[200px] truncate cursor-help text-black" title={item.refined}>
            {item.refined.substring(0, 70)}
            {item.refined.length > 70 ? "..." : ""}
          </div>
        </td>
        <td className="px-3 py-2 align-top whitespace-nowrap">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 hover:bg-gray-100 text-black"
              onClick={handleUse}
              title="Reuse this prompt"
            >
              <RotateCw size={12} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 hover:bg-gray-100 text-black"
              onClick={handleCopy}
              title="Replicate to clipboard"
            >
              <Copy size={12} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 hover:bg-gray-100 text-black"
              onClick={handleToggle}
              title={isExpanded ? "Retract" : "Reveal"}
            >
              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </Button>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-t border-gray-200">
          <td colSpan={4} className="px-4 py-3 bg-white">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="font-semibold mb-1 text-black">Raw:</div>
                <div className="bg-gray-50 p-2 rounded border border-gray-200 whitespace-pre-wrap text-black font-medium">
                  {item.original}
                </div>
                {item.context && (
                  <>
                    <div className="font-semibold mt-2 mb-1 text-black">Related:</div>
                    <div className="bg-gray-50 p-2 rounded border border-gray-200 whitespace-pre-wrap text-black font-medium">
                      {item.context}
                    </div>
                  </>
                )}
              </div>
              <div>
                <div className="font-semibold mb-1 text-black">Refactored:</div>
                <div className="bg-gray-50 p-2 rounded border border-gray-200 whitespace-pre-wrap text-black font-medium">
                  {item.refined}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
});

HistoryRow.displayName = 'HistoryRow';

// Interface for tracking prompt history
interface PromptHistoryItem {
  original: string;
  refined: string;
  context?: string;
  timestamp: Date;
  metadata?: {
    source?: string;
    model?: string;
    processingTime?: number;
  };
}

// Return type for the engineer API
interface EngineerResponse {
  result: string;
  metadata?: {
    source?: string;
    model?: string;
    processingTime?: number;
  };
}

// State management with useReducer for better performance
interface PromptState {
  prompt: string;
  context: string;
  result: string;
  refinedWithContext: string;
  isLoading: boolean;
  isLoadingContext: boolean;
  copied: boolean;
  showContext: boolean;
  error: string | null;
  showFeedback: boolean;
  promptHistory: PromptHistoryItem[];
  showHistory: boolean;
  expandedItems: Set<number>;
  hasRefinedPrompt: boolean;
  enhancementSource: string | null;
  enhancementTime: number | null;
}

type PromptAction =
  | { type: 'SET_PROMPT'; payload: string }
  | { type: 'SET_CONTEXT'; payload: string }
  | { type: 'SET_RESULT'; payload: string }
  | { type: 'SET_REFINED_WITH_CONTEXT'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_LOADING_CONTEXT'; payload: boolean }
  | { type: 'SET_COPIED'; payload: boolean }
  | { type: 'SET_SHOW_CONTEXT'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SHOW_FEEDBACK'; payload: boolean }
  | { type: 'SET_PROMPT_HISTORY'; payload: PromptHistoryItem[] }
  | { type: 'ADD_TO_HISTORY'; payload: PromptHistoryItem }
  | { type: 'SET_SHOW_HISTORY'; payload: boolean }
  | { type: 'TOGGLE_EXPAND_ITEM'; payload: number }
  | { type: 'SET_HAS_REFINED_PROMPT'; payload: boolean }
  | { type: 'SET_ENHANCEMENT_METADATA'; payload: { source: string | null; time: number | null } }
  | { type: 'CLEAR_ALL' }
  | { type: 'RESET_FORM' };

const initialState: PromptState = {
  prompt: '',
  context: '',
  result: '',
  refinedWithContext: '',
  isLoading: false,
  isLoadingContext: false,
  copied: false,
  showContext: false,
  error: null,
  showFeedback: false,
  promptHistory: [],
  showHistory: true,
  expandedItems: new Set(),
  hasRefinedPrompt: false,
  enhancementSource: null,
  enhancementTime: null,
};

function promptReducer(state: PromptState, action: PromptAction): PromptState {
  switch (action.type) {
    case 'SET_PROMPT':
      return { ...state, prompt: action.payload };
    case 'SET_CONTEXT':
      return { ...state, context: action.payload };
    case 'SET_RESULT':
      return { ...state, result: action.payload };
    case 'SET_REFINED_WITH_CONTEXT':
      return { ...state, refinedWithContext: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_LOADING_CONTEXT':
      return { ...state, isLoadingContext: action.payload };
    case 'SET_COPIED':
      return { ...state, copied: action.payload };
    case 'SET_SHOW_CONTEXT':
      return { ...state, showContext: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_SHOW_FEEDBACK':
      return { ...state, showFeedback: action.payload };
    case 'SET_PROMPT_HISTORY':
      return { ...state, promptHistory: action.payload };
    case 'ADD_TO_HISTORY':
      return { 
        ...state, 
        promptHistory: [action.payload, ...state.promptHistory],
        hasRefinedPrompt: true
      };
    case 'SET_SHOW_HISTORY':
      return { ...state, showHistory: action.payload };
    case 'TOGGLE_EXPAND_ITEM': {
      const newSet = new Set(state.expandedItems);
      if (newSet.has(action.payload)) {
        newSet.delete(action.payload);
      } else {
        newSet.add(action.payload);
      }
      return { ...state, expandedItems: newSet };
    }
    case 'SET_HAS_REFINED_PROMPT':
      return { ...state, hasRefinedPrompt: action.payload };
    case 'SET_ENHANCEMENT_METADATA':
      return { 
        ...state, 
        enhancementSource: action.payload.source,
        enhancementTime: action.payload.time
      };
    case 'CLEAR_ALL':
      return {
        ...state,
        prompt: '',
        context: '',
        result: '',
        refinedWithContext: '',
        error: null,
        showFeedback: false,
        showContext: false,
        showHistory: false
      };
    case 'RESET_FORM':
      return {
        ...state,
        result: '',
        refinedWithContext: '',
        showFeedback: false,
        error: null,
        enhancementSource: null,
        enhancementTime: null
      };
    default:
      return state;
  }
}

export default function PromptEngineer() {
  const [state, dispatch] = useReducer(promptReducer, initialState);

  // Load existing history when component mounts - memoized
  const loadHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/engineer/history');
      if (response.ok) {
        const data = await response.json();
        if (data.items && Array.isArray(data.items) && data.items.length > 0) {
          // Convert timestamp strings to Date objects with error handling
          const itemsWithDates = data.items.map((item: any) => {
            try {
              const timestamp = item.timestamp instanceof Date 
                ? item.timestamp 
                : new Date(item.timestamp);
              
              // Validate the timestamp
              if (isNaN(timestamp.getTime())) {
                console.warn('Invalid timestamp in API data:', item.timestamp);
                return { ...item, timestamp: new Date() };
              }
              
              return { ...item, timestamp };
            } catch (error) {
              console.error('Error converting timestamp:', error, item);
              return { ...item, timestamp: new Date() };
            }
          });
          dispatch({ type: 'SET_PROMPT_HISTORY', payload: itemsWithDates });
          dispatch({ type: 'SET_HAS_REFINED_PROMPT', payload: true });
          console.log(`Loaded ${data.items.length} history items`);
        }
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  }, []);
  
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Load prompt history from localStorage on component mount - optimized
  useEffect(() => {
    const loadLocalHistory = () => {
      try {
        const savedHistory = localStorage.getItem('promptHistory');
        if (savedHistory) {
          const parsedHistory = JSON.parse(savedHistory);
          const historyWithDates = parsedHistory.map((item: any) => {
            try {
              const timestamp = item.timestamp instanceof Date 
                ? item.timestamp 
                : new Date(item.timestamp);
              
              // Validate the timestamp
              if (isNaN(timestamp.getTime())) {
                console.warn('Invalid timestamp in localStorage:', item.timestamp);
                return { ...item, timestamp: new Date() };
              }
              
              return { ...item, timestamp };
            } catch (error) {
              console.error('Error converting localStorage timestamp:', error, item);
              return { ...item, timestamp: new Date() };
            }
          });
          dispatch({ type: 'SET_PROMPT_HISTORY', payload: historyWithDates });
          
          if (historyWithDates.length > 0) {
            dispatch({ type: 'SET_HAS_REFINED_PROMPT', payload: true });
          }
        }
      } catch (e) {
        console.error('Failed to load prompt history:', e);
      }
    };
    
    // Use requestIdleCallback for non-critical localStorage operations
    if ('requestIdleCallback' in window) {
      requestIdleCallback(loadLocalHistory);
    } else {
      setTimeout(loadLocalHistory, 0);
    }
  }, []);

  // Save prompt history to localStorage whenever it changes - debounced with comprehensive error handling
  useEffect(() => {
    const saveHistory = () => {
      try {
        // Enhanced error handling for localStorage operations
        const historyData = JSON.stringify(state.promptHistory);
        localStorage.setItem('promptHistory', historyData);
        console.log('Successfully saved', state.promptHistory.length, 'history items');
      } catch (e) {
        console.error('Failed to save prompt history:', e);
        // If localStorage is full, try to clear old data
        if (e instanceof Error && e.name === 'QuotaExceededError') {
          try {
            const reduced = state.promptHistory.slice(0, 25); // Keep only 25 most recent
            localStorage.setItem('promptHistory', JSON.stringify(reduced));
            console.log('Reduced history to 25 items due to storage limit');
          } catch (reduceError) {
            console.error('Failed to reduce history size:', reduceError);
          }
        }
      }
    };
    
    // Debounce localStorage writes
    const timeoutId = setTimeout(saveHistory, 300);
    return () => clearTimeout(timeoutId);
  }, [state.promptHistory]);

  // Add item to prompt history - optimized with dispatch
  const addToHistory = useCallback((original: string, refined: string, contextValue?: string, metadata?: any) => {
    const historyItem: PromptHistoryItem = {
      original,
      refined,
      context: contextValue,
      timestamp: new Date(),
      metadata
    };
    
    // Send to server for ML training purposes (non-blocking)
    storeForTraining(historyItem);
    
    // Update local history state via reducer
    dispatch({ type: 'ADD_TO_HISTORY', payload: historyItem });
  }, []);
  
  // Store history item for ML training - non-blocking with error handling
  const storeForTraining = useCallback(async (item: PromptHistoryItem) => {
    try {
      // Non-blocking fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      await fetch('/api/engineer/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Failed to store prompt history for training:', error);
      }
    }
  }, []);

  // Define handleSubmit with useCallback to avoid dependency issues - optimized
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!state.prompt.trim()) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SET_SHOW_FEEDBACK', payload: false });
    dispatch({ type: 'SET_REFINED_WITH_CONTEXT', payload: '' });
    dispatch({ type: 'SET_ENHANCEMENT_METADATA', payload: { source: null, time: null } });

    try {
      // Check multiple ways to determine if this is a refinement - memoized
      const lastRefinedPrompt = localStorage.getItem('lastRefinedPrompt');
      const trimmedPrompt = state.prompt.trim();
      const isInHistory = state.promptHistory.some(item => item.refined === trimmedPrompt);
      const wasLastRefined = lastRefinedPrompt === trimmedPrompt;
      
      // Consider it a refinement if it matches previous history OR the last refined prompt
      const isRefinement = isInHistory || wasLastRefined;
      
      // Check if this is an expansion request (from Repeat button)
      const repeatType = localStorage.getItem('repeatType')
      const repeatCount = parseInt(localStorage.getItem('repeatCount') || '0')
      const isExpansion = repeatType === 'expand' && repeatCount > 0
      
      // If we're not sure if it's refined, ask the user
      if (isLikelyRefined(state.prompt) && !isRefinement && !isExpansion && !confirm("This prompt appears to be already refined. Continue with refinement?")) {
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }
      
      // Clear repeatType after using it
      if (isExpansion) {
        localStorage.removeItem('repeatType')
      }

      const response = await fetch('/api/engineer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: state.prompt,
          context: state.context || "",
          isRefinement,
          isExpansion,
          repeatCount
        }),
      })

      const data: EngineerResponse = await response.json()
      
      if (response.ok && data.result) {
        dispatch({ type: 'SET_RESULT', payload: data.result });
        addToHistory(state.prompt, data.result, state.context, data.metadata);
        
        // Also set enhanced prompt with context if context is provided
        if (state.context) {
          dispatch({ type: 'SET_REFINED_WITH_CONTEXT', payload: `Context: ${state.context}\n\nPrompt: ${data.result}` });
        }
        
        // Store the last refined prompt for comparison in future requests
        localStorage.setItem('lastRefinedPrompt', data.result);
        
        // Store enhancement source and time information if available
        if (data.metadata) {
          dispatch({ 
            type: 'SET_ENHANCEMENT_METADATA', 
            payload: { 
              source: data.metadata.source || null, 
              time: data.metadata.processingTime || null 
            } 
          });
        }
      } else {
        throw new Error(data.result || 'Failed to enhance prompt');
      }
    } catch (error) {
      console.error('Error enhancing prompt:', error);
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'An error occurred' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.prompt, state.context, state.promptHistory, addToHistory]);

  // Check if a prompt is already refined - memoized with better heuristics
  const isLikelyRefined = useCallback((text: string): boolean => {
    const isLong = text.length > 150;
    const hasStructure = text.includes(', ') && text.includes('.');
    const hasSpecifics = /\b(include|sections|design|ensure|provide|create|implement)\b/i.test(text);
    const hasInstructions = /\b(should|must|will|need to|please|make sure)\b/i.test(text);
    
    return isLong && hasStructure && (hasSpecifics || hasInstructions);
  }, []);

  // Add keyboard shortcut for refine action
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+Enter (Mac) or Ctrl+Enter (Windows)
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        const activeElement = document.activeElement;
        
        // Only trigger if focus is in the prompt textarea
        if (activeElement && activeElement.id === 'promptTextarea' && state.prompt.trim()) {
          e.preventDefault();
          // Directly call the handleSubmit function
          handleSubmit(new Event('submit', { cancelable: true }) as unknown as React.FormEvent);
        }
      }
    };
    
    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [state.prompt, handleSubmit]); // Include handleSubmit in dependencies

  // Define function for refining with context - optimized
  const handleRefineWithContext = useCallback(async () => {
    if (!state.result.trim() || !state.context.trim()) return;

    dispatch({ type: 'SET_LOADING_CONTEXT', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const response = await fetch('/api/engineer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: state.result, context: state.context }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Don't throw an error, just log it and handle gracefully
        console.error("Response not OK for context refinement:", data)
        if (data.result) {
          // If we have a result despite the error, use it
          dispatch({ type: 'SET_REFINED_WITH_CONTEXT', payload: data.result });
          addToHistory(state.result, data.result, state.context);
        } else {
          // Otherwise just use the original prompt with context appended
          const fallbackResult = `${state.result} (with context: ${state.context})`;
          dispatch({ type: 'SET_REFINED_WITH_CONTEXT', payload: fallbackResult });
          addToHistory(state.result, fallbackResult, state.context);
        }
        return
      }

      // Handle successful response
      if (data.result) {
        dispatch({ type: 'SET_REFINED_WITH_CONTEXT', payload: data.result });
        // Add the context-refined prompt to history
        addToHistory(state.result, data.result, state.context);
      } else {
        // Handle case where no result was returned
        const fallbackResult = `${state.result} (with context: ${state.context})`;
        dispatch({ type: 'SET_REFINED_WITH_CONTEXT', payload: fallbackResult });
        addToHistory(state.result, fallbackResult, state.context);
      }
    } catch (err) {
      console.error('Error enhancing prompt with context:', err)
      // Don't show error to user, create a fallback result
      const fallbackResult = `${state.result} (with context: ${state.context})`;
      dispatch({ type: 'SET_REFINED_WITH_CONTEXT', payload: fallbackResult });
      // Still add to history so user doesn't lose their input
      addToHistory(state.result, fallbackResult, state.context);
    } finally {
      dispatch({ type: 'SET_LOADING_CONTEXT', payload: false });
    }
  }, [state.result, state.context, addToHistory]);

  // Memoized copy to clipboard function
  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    dispatch({ type: 'SET_COPIED', payload: true });
    setTimeout(() => dispatch({ type: 'SET_COPIED', payload: false }), 2000);
  }, []);

  // Memoized callback for using prompt from history
  const handleUsePromptFromHistory = useCallback((refined: string) => {
    dispatch({ type: 'SET_PROMPT', payload: refined });
  }, []);

  // Emergency function to clear all localStorage data - enhanced with dispatch
  const clearAllData = useCallback(() => {
    try {
      localStorage.removeItem('promptHistory');
      localStorage.removeItem('hasRefinedPrompt');
      localStorage.removeItem('lastRefinedPrompt');
      localStorage.removeItem('repeatType');
      localStorage.removeItem('repeatCount');
      dispatch({ type: 'SET_PROMPT_HISTORY', payload: [] });
      dispatch({ type: 'SET_HAS_REFINED_PROMPT', payload: false });
      console.log('All localStorage data cleared successfully');
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }, []);

  // Toggle expanded state for a history item - memoized
  const toggleExpandItem = useCallback((index: number) => {
    dispatch({ type: 'TOGGLE_EXPAND_ITEM', payload: index });
  }, []);

  // Format timestamp for display - memoized with comprehensive error handling
  const formatTime = useCallback((date: Date | string | number | null | undefined): string => {
    try {
      // Handle various input types and edge cases
      if (!date) {
        return 'Just now';
      }
      
      let validDate: Date;
      
      if (date instanceof Date) {
        validDate = date;
      } else {
        validDate = new Date(date);
      }
      
      // Validate the resulting date
      if (!validDate || isNaN(validDate.getTime())) {
        console.warn('Invalid date passed to formatTime:', date, 'Type:', typeof date);
        return 'Just now';
      }
      
      // Calculate time since the event
      const now = new Date();
      const diffMs = now.getTime() - validDate.getTime();
      
      // Handle negative differences (future dates)
      if (diffMs < 0) {
        return 'Just now';
      }
      
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch (error) {
      console.error('Critical error in formatTime:', error, 'Input was:', date, 'Type:', typeof date);
      return 'Just now';
    }
  }, []);

  // Memoized history table with virtualization for large lists
  const historyTable = useMemo(() => {
    if (state.promptHistory.length === 0) {
      return (
        <div className="text-center p-4 bg-gray-200 rounded-md border border-dashed border-gray-400">
          <div className="text-black font-semibold">No refinement records yet</div>
        </div>
      );
    }

    return (
      <div className="border border-gray-200 rounded-md overflow-hidden shadow-sm">
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-xs" aria-label="Prompt refinement history">
            <caption className="sr-only">
              History of prompt refinements with timestamps, original prompts, refined versions, and available actions
            </caption>
            <thead className="bg-white border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-semibold text-black">Recency</th>
                <th scope="col" className="px-3 py-2 text-left font-semibold text-black">Raw</th>
                <th scope="col" className="px-3 py-2 text-left font-semibold text-black">Refactored</th>
                <th scope="col" className="px-3 py-2 text-left font-semibold text-black">Revolve</th>
              </tr>
            </thead>
            <tbody>
              {state.promptHistory.map((item, index) => {
                // Defensive timestamp handling for React key
                const getTimestampKey = (timestamp: any): number => {
                  if (timestamp instanceof Date) {
                    return timestamp.getTime();
                  } else if (typeof timestamp === 'string') {
                    return new Date(timestamp).getTime();
                  } else if (typeof timestamp === 'number') {
                    return timestamp;
                  }
                  return Date.now(); // Fallback
                };
                
                return (
                  <HistoryRow
                    key={`${getTimestampKey(item.timestamp)}-${index}`}
                  item={item}
                  index={index}
                  isExpanded={state.expandedItems.has(index)}
                  onToggleExpand={toggleExpandItem}
                  onUsePrompt={handleUsePromptFromHistory}
                  onCopyToClipboard={copyToClipboard}
                    formatTime={formatTime}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }, [state.promptHistory, state.expandedItems, toggleExpandItem, handleUsePromptFromHistory, copyToClipboard, formatTime]);

  // Memoized clear all function
  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  // Memoized repeat function
  const handleRepeat = useCallback(() => {
    const textToRepeat = state.refinedWithContext || state.result;
    dispatch({ type: 'SET_PROMPT', payload: textToRepeat });
    dispatch({ type: 'RESET_FORM' });
    
    // Store this as a refinement to ensure it keeps improving
    localStorage.setItem('lastRefinedPrompt', textToRepeat);
    
    // Store metadata indicating this is a request for further expansion/elaboration
    localStorage.setItem('repeatType', 'expand');
    localStorage.setItem('repeatCount', String(parseInt(localStorage.getItem('repeatCount') || '0') + 1));
  }, [state.refinedWithContext, state.result]);



  // Toggle context input visibility - optimized
  const toggleContext = useCallback(() => {
    dispatch({ type: 'SET_SHOW_CONTEXT', payload: !state.showContext });
  }, [state.showContext]);

  // Function to handle expansion button (Repeat) - optimized
  const handleExpand = useCallback(() => {
    // Set the refined prompt as the new input
    dispatch({ type: 'SET_PROMPT', payload: state.result });
    
    // Store state to indicate this is an expansion request
    localStorage.setItem('repeatType', 'expand');
    
    // Increment the repeat count
    const currentCount = parseInt(localStorage.getItem('repeatCount') || '0');
    localStorage.setItem('repeatCount', (currentCount + 1).toString());
    
    // Reset refined output
    dispatch({ type: 'RESET_FORM' });
  }, [state.result]);

  // Function to set a prompt from history - optimized
  const setPromptFromHistory = useCallback((item: PromptHistoryItem) => {
    dispatch({ type: 'SET_PROMPT', payload: item.refined });
    if (item.context) {
      dispatch({ type: 'SET_CONTEXT', payload: item.context });
      dispatch({ type: 'SET_SHOW_CONTEXT', payload: true });
    }
    dispatch({ type: 'RESET_FORM' });
  }, []);

  // Function to provide feedback on enhancement - optimized
  const provideFeedback = useCallback((isPositive: boolean) => {
    // Send feedback to server (non-blocking)
    fetch('/api/engineer/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        original: state.prompt,
        refined: state.result,
        wasSuccessful: isPositive
      }),
    }).catch(err => console.error('Failed to send feedback:', err));
    
    // Show feedback confirmation
    dispatch({ type: 'SET_SHOW_FEEDBACK', payload: true });
  }, [state.prompt, state.result]);

  return (
    <div className="w-full max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold tracking-tight">
          <a href="https://zeidgeist.vercel.app" className="text-black hover:text-gray-700 transition-colors">
            mstprmpt<sub className="text-xs">.zeidgeist.com</sub>
          </a>
          <span className="text-black font-medium text-sm ml-2">v0.6.8</span>
        </h1>
      </div>

      <div className="grid gap-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-black">Raw</h2>
            {(state.prompt || state.context || state.result || state.refinedWithContext) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  dispatch({ type: 'CLEAR_ALL' });
                }}
                className="h-8 w-8"
              >
                <X size={16} />
              </Button>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div>
              <VisibleTextarea
                id="promptTextarea"
                placeholder="Ramble..." 
                aria-label="Raw prompt input"
                aria-describedby={state.error ? "prompt-error" : undefined}
                style={{ height: '96px' }}
                value={state.prompt}
                onChange={(e) => dispatch({ type: 'SET_PROMPT', payload: e.target.value })}
                required
              />
            </div>

            <div className="flex justify-end items-center">
              <Button
                type="submit"
                size="sm"
                className="bg-black-primary hover:bg-black-rich text-white-pure flex items-center gap-2"
                disabled={state.isLoading || !state.prompt.trim()}
                title={`Refactor prompt (${navigator.platform.includes('Mac') ? '⌘+Return' : 'Ctrl+Enter'})`}
              >
                {state.isLoading ? <Loader2 size={14} className="animate-spin" aria-label="Processing prompt" /> : <Send size={14} />}
                <span className="font-semibold">Refactor</span>
              </Button>
            </div>
          </form>

          {state.error && (
            <div id="prompt-error" className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm" role="alert">
              {state.error}
            </div>
          )}

          {state.result && !state.refinedWithContext && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-semibold text-black">Refactored</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(state.result)}
                  className="h-7 text-black"
                >
                  {state.copied ? <Check size={14} /> : <Copy size={14} />}
                </Button>
              </div>
              <div className="bg-gray-50 p-3 rounded border border-gray-300 text-sm text-black whitespace-pre-wrap font-medium">{state.result}</div>
              
              {/* Enhancement metadata display */}
              {(state.enhancementSource || state.enhancementTime !== null) && (
                <div className="mt-2 flex items-center gap-4 text-xs text-black">
                  {state.enhancementSource && (
                    <div className="flex items-center gap-1">
                      <Zap size={12} />
                      <span>Enhanced by: {state.enhancementSource === 'external-api' ? 'AI' : state.enhancementSource}</span>
                    </div>
                  )}
                  {state.enhancementTime !== null && (
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>{state.enhancementTime}ms</span>
                    </div>
                  )}
                </div>
              )}
              
              <div className="mt-3">
                <div className="flex justify-between items-center">
                  <Button
                    type="button"
                    variant={state.showContext ? "default" : "outline"}
                    size="sm"
                    onClick={() => dispatch({ type: 'SET_SHOW_CONTEXT', payload: !state.showContext })}
                    className="text-black"
                  >
                    <Info size={14} className="mr-1" />
                    Relate Context
                    {state.showContext ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />}
                  </Button>
                  
                  <div className="flex gap-2">
                    {!state.showFeedback && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => dispatch({ type: 'SET_SHOW_FEEDBACK', payload: true })}
                      >
                        Report
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      className="bg-white border border-gray-300 hover:bg-gray-50 text-black" 
                      onClick={handleExpand}
                    >
                      <RotateCw size={14} className="mr-1" />
                      Repeat
                    </Button>
                  </div>
                </div>
                
                {state.showContext && (
                  <div className="mt-3 space-y-3">
                    <VisibleTextarea
                      placeholder="Relevant contextual information..." 
                      aria-label="Relevant context input"
                      style={{ height: '80px' }}
                      value={state.context}
                      onChange={(e) => dispatch({ type: 'SET_CONTEXT', payload: e.target.value })}
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white-pure"
                        onClick={handleRefineWithContext}
                        disabled={state.isLoadingContext || !state.context.trim()}
                      >
                        {state.isLoadingContext ? <Loader2 size={14} className="animate-spin" aria-label="Processing with context" /> : <Zap size={14} />}
                        <span className="ml-1 font-semibold">Refine+</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              {state.showFeedback && (
                <div className="mt-4">
                  <FeedbackForm 
                    originalPrompt={state.prompt}
                    enhancedPrompt={state.result}
                    onClose={() => dispatch({ type: 'SET_SHOW_FEEDBACK', payload: false })}
                  />
                </div>
              )}
            </div>
          )}

          {state.refinedWithContext && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-semibold text-black">Refactored+ (with context)</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(state.refinedWithContext)}
                  className="h-7 text-black"
                >
                  {state.copied ? <Check size={14} /> : <Copy size={14} />}
                </Button>
              </div>
              <div className="bg-gray-50 p-3 rounded border border-gray-300 text-sm text-black whitespace-pre-wrap font-medium">
                {state.refinedWithContext}
              </div>
              
              {/* Enhancement metadata display for context refinement */}
              {(state.enhancementSource || state.enhancementTime !== null) && (
                <div className="mt-2 flex items-center gap-4 text-xs text-black">
                  {state.enhancementSource && (
                    <div className="flex items-center gap-1">
                      <Zap size={12} />
                      <span>Enhanced by: {state.enhancementSource === 'external-api' ? 'AI' : state.enhancementSource}</span>
                    </div>
                  )}
                  {state.enhancementTime !== null && (
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>{state.enhancementTime}ms</span>
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex justify-end gap-2 mt-3">
                {!state.showFeedback && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => dispatch({ type: 'SET_SHOW_FEEDBACK', payload: true })}
                  >
                    Give Feedback
                  </Button>
                )}
                <Button 
                  size="sm" 
                  className="bg-white border border-gray-300 hover:bg-gray-50 text-black" 
                  onClick={handleExpand}
                >
                  <RotateCw size={14} className="mr-1" />
                  Repeat
                </Button>
              </div>
              
              {state.showFeedback && (
                <div className="mt-4">
                  <FeedbackForm 
                    originalPrompt={state.prompt}
                    enhancedPrompt={state.refinedWithContext}
                    onClose={() => dispatch({ type: 'SET_SHOW_FEEDBACK', payload: false })}
                  />
                </div>
              )}
            </div>
          )}
          
          {/* Prompt History / Audit Trail */}
          {state.hasRefinedPrompt && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-semibold text-black">Receipt{state.promptHistory.length === 1 ? '' : 's'} ({state.promptHistory.length} record{state.promptHistory.length === 1 ? '' : 's'})</h2>
                <Button
                  variant="ghost" 
                  size="sm"
                  onClick={() => dispatch({ type: 'SET_SHOW_HISTORY', payload: !state.showHistory })}
                  className="h-7"
                >
                  {state.showHistory ? "Retract" : "Reveal"}
                </Button>
              </div>
              
              {state.showHistory && (
                <div className="mt-2">
                  {historyTable}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <SimpleToast show={state.copied} message="Copied to clipboard!" />
    </div>
  )
}

