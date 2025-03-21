"use client"

import React from "react"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Send, Copy, Check, Info, X, ChevronDown, ChevronUp, RotateCw, Zap, Clock, Share, ClipboardIcon, ExternalLink } from "lucide-react"
import FeedbackForm from "./feedback-form"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { fetchHistory, saveHistoryItem, exportHistory } from '../lib/api';
import { cn } from "@/lib/utils"

// Update the API URLs to point directly to the backend server
// In production or when hosted on the same domain, use relative URLs
// Only use localhost during local development
const API_BASE_URL = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? '/prompter' // Use the correct base path in production
  : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8084';

// Create a simple inline toast component
function SimpleToast({ show, message }: { show: boolean, message: string }) {
  if (!show) return null;
  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white py-2 px-4 rounded-md shadow-lg transition-opacity duration-300">
      {message}
    </div>
  );
}

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

export default function PromptEngineer() {
  const [prompt, setPrompt] = useState("")
  const [context, setContext] = useState("")
  const [result, setResult] = useState("")
  const [refinedWithContext, setRefinedWithContext] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingContext, setIsLoadingContext] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showContext, setShowContext] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  // New state for the audit trail
  const [promptHistory, setPromptHistory] = useState<PromptHistoryItem[]>([])
  const [showHistory, setShowHistory] = useState(true)  // Show history by default
  // Track expanded history items
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())
  
  // Flag to track if at least one prompt has been refined
  const [hasRefinedPrompt, setHasRefinedPrompt] = useState(false)
  const [enhancementSource, setEnhancementSource] = useState<string | null>(null)
  const [enhancementTime, setEnhancementTime] = useState<number | null>(null)

  // State to track chunking progress
  const [processingChunks, setProcessingChunks] = useState(false);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [combinedResult, setCombinedResult] = useState("");

  // Add this state for chunking notification
  const [chunkingNotification, setChunkingNotification] = useState<string | null>(null);

  // Load existing history when component mounts
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const historyItems = await fetchHistory();
        if (historyItems && Array.isArray(historyItems) && historyItems.length > 0) {
          // Ensure timestamps are Date objects
          const historyWithDates = historyItems.map((item: any) => ({
            ...item,
            timestamp: item.timestamp ? new Date(item.timestamp) : new Date()
          }));
          setPromptHistory(historyWithDates);
          setHasRefinedPrompt(true); // Set flag if we load any history items
          console.log(`Loaded ${historyItems.length} history items`);
        }
      } catch (error) {
        console.error('Failed to load history:', error);
      }
    };
    
    loadHistory();
  }, []);

  // Load prompt history from localStorage on component mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('promptHistory')
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory)
        // Convert string timestamps back to Date objects with validation
        const historyWithDates = parsedHistory.map((item: any) => {
          let timestamp;
          try {
            timestamp = new Date(item.timestamp);
            // Check if date is valid
            if (isNaN(timestamp.getTime())) {
              timestamp = new Date(); // Fallback to current date if invalid
            }
          } catch (e) {
            timestamp = new Date(); // Fallback to current date if conversion fails
          }
          return {
            ...item,
            timestamp
          };
        });
        setPromptHistory(historyWithDates)
        
        // If we have history, set the hasRefinedPrompt flag
        if (historyWithDates.length > 0) {
          setHasRefinedPrompt(true)
        }
      }
    } catch (e) {
      console.error('Failed to load prompt history:', e)
    }
  }, [])

  // Save prompt history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('promptHistory', JSON.stringify(promptHistory))
    } catch (e) {
      console.error('Failed to save prompt history:', e)
    }
  }, [promptHistory])

  // Add item to prompt history
  const addToHistory = useCallback((original: string, refined: string, contextValue?: string, metadata?: any) => {
    // Create a valid timestamp
    const timestamp = new Date();
    
    // Ensure it's a valid date object
    if (isNaN(timestamp.getTime())) {
      console.error('Created invalid timestamp, using current time instead');
      timestamp.setTime(Date.now());
    }
    
    const historyItem: PromptHistoryItem = {
      original,
      refined,
      context: contextValue,
      timestamp: timestamp,
      metadata
    }
    
    // Send to server for ML training purposes
    storeForTraining(historyItem)
    
    // Update local history state
    setPromptHistory(prevHistory => [historyItem, ...prevHistory])
    
    // Set flag that we have at least one refined prompt
    setHasRefinedPrompt(true)
  }, [])
  
  // Store history item for ML training
  const storeForTraining = async (item: PromptHistoryItem) => {
    try {
      await saveHistoryItem(item);
    } catch (error) {
      console.error('Failed to store prompt history for training:', error)
    }
  }

  // Check if a prompt is already refined
  const isLikelyRefined = useCallback((text: string): boolean => {
    const isLong = text.length > 150
    const hasStructure = text.includes(', ') && text.includes('.')
    const hasSpecifics = text.includes('include') || text.includes('sections') || text.includes('design')
    
    return isLong && hasStructure && hasSpecifics
  }, [])

  // Function to chunk text into smaller pieces
  const chunkText = useCallback((text: string, maxChunkSize: number = 4000): string[] => {
    // If text is already under the limit, return as a single chunk
    if (text.length <= maxChunkSize) {
      return [text];
    }
    
    const chunks: string[] = [];
    let currentChunk = "";
    
    // Split by paragraphs first for more natural chunks
    const paragraphs = text.split(/\n+/);
    
    for (const paragraph of paragraphs) {
      // If adding this paragraph would exceed the chunk size, save current chunk and start a new one
      if (currentChunk.length + paragraph.length + 1 > maxChunkSize) {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk);
          currentChunk = "";
        }
        
        // If a single paragraph is longer than maxChunkSize, split it by sentences
        if (paragraph.length > maxChunkSize) {
          const sentences = paragraph.split(/(?<=[.!?])\s+/);
          for (const sentence of sentences) {
            if (currentChunk.length + sentence.length + 1 > maxChunkSize) {
              if (currentChunk.length > 0) {
                chunks.push(currentChunk);
                currentChunk = "";
              }
              
              // If a single sentence is still too long, split by words
              if (sentence.length > maxChunkSize) {
                let remainingSentence = sentence;
                while (remainingSentence.length > 0) {
                  const chunkLength = Math.min(remainingSentence.length, maxChunkSize);
                  chunks.push(remainingSentence.substring(0, chunkLength));
                  remainingSentence = remainingSentence.substring(chunkLength);
                }
              } else {
                currentChunk = sentence;
              }
            } else {
              currentChunk += (currentChunk.length > 0 ? " " : "") + sentence;
            }
          }
        } else {
          currentChunk = paragraph;
        }
      } else {
        currentChunk += (currentChunk.length > 0 ? "\n" : "") + paragraph;
      }
    }
    
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }, []);

  // Function to process chunks sequentially
  const processChunks = useCallback(async (chunks: string[]) => {
    setProcessingChunks(true);
    setTotalChunks(chunks.length);
    setCombinedResult("");
    
    const results: string[] = [];
    let i = 0;
    
    for (const chunk of chunks) {
      setCurrentChunk(i + 1);
      
      try {
        // Process individual chunk
        const response = await fetch(`${API_BASE_URL}/api/engineer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          },
          body: JSON.stringify({ 
            prompt: chunk,
            context: context || "",
            isChunk: true,
            chunkIndex: i,
            totalChunks: chunks.length
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Server error: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        if (data.result) {
          results.push(data.result);
          
          // Update the combined result in real-time
          const currentCombined = results.join("\n\n");
          setCombinedResult(currentCombined);
        }
      } catch (error) {
        console.error(`Error processing chunk ${i+1}:`, error);
        // Continue with other chunks even if one fails
        results.push(`[Error processing this section: ${error instanceof Error ? error.message : "Unknown error"}]`);
      }
      
      i++;
    }
    
    // If all chunks are processed, combine and set the final result
    const finalResult = results.join("\n\n");
    setResult(finalResult);
    
    // Add to history
    addToHistory(prompt, finalResult, context);
    
    // Store as last refined prompt
    localStorage.setItem('lastRefinedPrompt', finalResult);
    
    setProcessingChunks(false);
    return finalResult;
  }, [context, addToHistory, prompt]);

  // Now modify the safeSubmit function to use chunking for large prompts
  const safeSubmit = useCallback(async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt before submitting.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setShowFeedback(false);
      setRefinedWithContext("");
      setEnhancementSource(null);
      setEnhancementTime(null);
      
      // Check if prompt exceeds single chunk size
      const CHUNK_SIZE = 4000; // Characters
      if (prompt.length > CHUNK_SIZE) {
        // Show user-friendly message about chunking
        setChunkingNotification(`Your prompt is ${prompt.length} characters and will be processed in chunks for better results.`);
        
        // Chunk the text
        const chunks = chunkText(prompt, CHUNK_SIZE);
        console.log(`Chunked large prompt into ${chunks.length} parts`);
        
        // Process chunks and get result
        await processChunks(chunks);
        
        // Clear notification when done
        setChunkingNotification(null);
      } else {
        // Regular processing for smaller prompts
        // Refinement logic
        const lastRefinedPrompt = localStorage.getItem('lastRefinedPrompt');
        const isInHistory = promptHistory.some(item => item.refined === prompt.trim());
        const wasLastRefined = lastRefinedPrompt === prompt.trim();
        const isRefinement = isInHistory || wasLastRefined;
        
        // Expansion logic
        const repeatType = localStorage.getItem('repeatType');
        const repeatCount = parseInt(localStorage.getItem('repeatCount') || '0');
        const isExpansion = repeatType === 'expand' && repeatCount > 0;
        
        // Check if refined
        if (isLikelyRefined(prompt) && !isRefinement && !isExpansion && !confirm("This prompt appears to be already refined. Continue with refinement?")) {
          setIsLoading(false);
          return;
        }
        
        // Clear repeatType after using it
        if (isExpansion) {
          localStorage.removeItem('repeatType');
        }

        console.log("Submitting prompt for regular processing:", {
          promptLength: prompt.length,
          context: context ? "provided" : "not provided",
          isRefinement,
          isExpansion
        });

        // Make API call
        const response = await fetch(`${API_BASE_URL}/api/engineer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          },
          body: JSON.stringify({ 
            prompt,
            context: context || "",
            isRefinement,
            isExpansion,
            repeatCount
          }),
        });

        // Handle response
        if (!response.ok) {
          console.error("API response not OK:", response.status, response.statusText);
          setError(`Server error: ${response.statusText}`);
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        
        // Check for specific error details returned from the API
        if (data.error) {
          console.error("API returned error:", data.error);
          setError(`Error: ${data.error}`);
          setIsLoading(false);
          return;
        }
        
        if (data.result) {
          setResult(data.result);
          addToHistory(prompt, data.result, context, data.metadata);
          
          // Also set enhanced prompt with context if context is provided
          if (context) {
            setRefinedWithContext(`Context: ${context}\n\nPrompt: ${data.result}`);
          }
          
          // Store the last refined prompt for comparison in future requests
          localStorage.setItem('lastRefinedPrompt', data.result);
          
          // Store enhancement source and time information if available
          if (data.metadata) {
            if (data.metadata.source) {
              setEnhancementSource(data.metadata.source);
            }
            if (data.metadata.processingTime) {
              setEnhancementTime(data.metadata.processingTime);
            }
          }
        } else {
          setError("No result was returned from the enhancement service.");
        }
      }
    } catch (error) {
      console.error("Error submitting prompt:", error);
      setError(error instanceof Error ? error.message : "An error occurred while processing your request.");
    } finally {
      setIsLoading(false);
    }
  }, [prompt, context, promptHistory, addToHistory, isLikelyRefined, chunkText, processChunks]);

  // Handle form submission via the form element
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    safeSubmit();
  }, [safeSubmit]);

  // Handle keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+Enter (Mac) or Ctrl+Enter (Windows)
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        const activeElement = document.activeElement;
        console.log("Keyboard shortcut triggered, activeElement:", activeElement ? activeElement.id : 'none');
        
        // Only trigger if focus is in the prompt textarea
        if (activeElement && activeElement.id === 'promptTextarea' && prompt.trim()) {
          console.log("Submitting form via keyboard shortcut");
          e.preventDefault();
          safeSubmit();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [prompt, safeSubmit]);

  // Update the error display to be more user-friendly
  const renderError = () => {
    if (!error) return null;
    
    let errorMessage = error;
    // Make common errors more user-friendly
    if (error.includes("did not match the expected pattern")) {
      errorMessage = "Your prompt contains characters or formatting that isn't supported. Please try simplifying your text and removing any special characters.";
    }
    
    return (
      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
        <div className="flex items-start">
          <X size={16} className="mr-2 mt-0.5 flex-shrink-0" />
          <div>{errorMessage}</div>
        </div>
        {error.includes("did not match the expected pattern") && (
          <div className="mt-2 text-xs">
            Try these tips:
            <ul className="list-disc pl-5 mt-1">
              <li>Remove special characters or emoji</li>
              <li>Break long paragraphs into shorter ones</li>
              <li>Use simpler punctuation</li>
            </ul>
          </div>
        )}
      </div>
    );
  };

  // Define function for refining with context
  const handleRefineWithContext = useCallback(async () => {
    if (!result.trim() || !context.trim()) return

    setIsLoadingContext(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/engineer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: result, context }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Don't throw an error, just log it and handle gracefully
        console.error("Response not OK for context refinement:", data)
        if (data.result) {
          // If we have a result despite the error, use it
          setRefinedWithContext(data.result)
          addToHistory(result, data.result, context)
        } else {
          // Otherwise just use the original prompt with context appended
          const fallbackResult = `${result} (with context: ${context})`;
          setRefinedWithContext(fallbackResult)
          addToHistory(result, fallbackResult, context)
        }
        return
      }

      // Handle successful response
      if (data.result) {
        setRefinedWithContext(data.result)
        // Add the context-refined prompt to history
        addToHistory(result, data.result, context)
      } else {
        // Handle case where no result was returned
        const fallbackResult = `${result} (with context: ${context})`;
        setRefinedWithContext(fallbackResult)
        // Still add to history so user doesn't lose their input
        addToHistory(result, fallbackResult, context)
      }
    } catch (err) {
      console.error('Error enhancing prompt with context:', err)
      // Don't show error to user, create a fallback result
      const fallbackResult = `${result} (with context: ${context})`;
      setRefinedWithContext(fallbackResult)
      // Still add to history so user doesn't lose their input
      addToHistory(result, fallbackResult, context)
    } finally {
      setIsLoadingContext(false)
    }
  }, [result, context, addToHistory])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const clearAll = () => {
    setPrompt("")
    setContext("")
    setResult("")
    setRefinedWithContext("")
    setError(null)
    setShowFeedback(false)
    setShowContext(false)
    // Keep history when clearing, just hide it
    setShowHistory(false)
  }

  const handleRepeat = () => {
    const textToRepeat = refinedWithContext || result;
    setPrompt(textToRepeat);
    setResult("");
    setRefinedWithContext("");
    setShowFeedback(false);
    setShowContext(false);
    setError(null);
    
    // Store this as a refinement to ensure it keeps improving
    localStorage.setItem('lastRefinedPrompt', textToRepeat);
    
    // Store metadata indicating this is a request for further expansion/elaboration
    localStorage.setItem('repeatType', 'expand');
    localStorage.setItem('repeatCount', String(parseInt(localStorage.getItem('repeatCount') || '0') + 1));
  }

  // Toggle expanded state for a history item
  const toggleExpandItem = (index: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }

  // Toggle context input visibility
  const toggleContext = useCallback(() => {
    setShowContext(prevState => !prevState)
  }, [])

  // Function to handle expansion button (Repeat)
  const handleExpand = useCallback(() => {
    // Set the refined prompt as the new input
    setPrompt(result)
    
    // Store state to indicate this is an expansion request
    localStorage.setItem('repeatType', 'expand')
    
    // Increment the repeat count
    const currentCount = parseInt(localStorage.getItem('repeatCount') || '0')
    localStorage.setItem('repeatCount', (currentCount + 1).toString())
    
    // Reset refined output
    setResult("")
    setRefinedWithContext("")
    setShowFeedback(false)
  }, [result])

  // Function to set a prompt from history
  const setPromptFromHistory = useCallback((item: PromptHistoryItem) => {
    setPrompt(item.refined)
    if (item.context) {
      setContext(item.context)
      setShowContext(true)
    }
    setResult("")
    setRefinedWithContext("")
    setShowFeedback(false)
  }, [])

  // Function to provide feedback on enhancement
  const provideFeedback = useCallback((isPositive: boolean) => {
    // Send feedback to server
    fetch(`${API_BASE_URL}/api/engineer/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        original: prompt,
        refined: result,
        wasSuccessful: isPositive
      }),
    }).catch(err => console.error('Failed to send feedback:', err))
    
    // Show feedback confirmation
    setShowFeedback(true)
  }, [prompt, result])

  // Helper to format API source names
  const formatSourceName = (source: string): string => {
    if (!source) return '';
    
    // Handle special cases
    if (source === 'local' || source === 'local-fallback') return 'Local Engine';
    if (source === 'fallback-expansion') return 'Expansion';
    if (source === 'fallback-refinement') return 'Refinement';
    if (source === 'error-minimal') return 'Minimal';
    if (source === 'error-fallback') return 'Fallback';
    
    // Capitalize API names
    const formatted = source.charAt(0).toUpperCase() + source.slice(1);
    return formatted;
  }

  // Add helper functions for the relay functionality
  const copyPromptToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const openExternalSite = (url: string, label: string) => {
    window.open(url, "_blank");
    toast.success(`Opening ${label} in new tab`);
  };

  return (
    <div className="w-full my-10">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-base font-medium">Raw</h1>
        {(prompt || context || result || refinedWithContext) && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={clearAll} 
            className="h-9 w-9 flex items-center justify-center hover:bg-gray-100 border border-transparent"
          >
            <X size={16} />
          </Button>
        )}
      </div>

      <form id="promptForm" onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Textarea
            id="promptTextarea"
            placeholder="Ramble..."
            className="resize-none h-28 border-gray-30 focus-visible:ring-black-primary w-full"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
          />
        </div>

        <div className="mt-1 flex justify-between items-center">
          <div className="text-xs text-gray-500"></div>
          <Button 
            type="submit"
            size="sm"
            className="bg-black-primary hover:bg-black-rich text-white-pure h-9 border border-transparent"
            disabled={isLoading || !prompt.trim()} 
            title={
              navigator.platform.indexOf('Mac') !== -1 
                ? "⌘+Return to refactor" 
                : "Ctrl+Enter to refactor"
            }
          >
            {isLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : <Send size={16} className="mr-2" />}
            <span>Refactor</span>
          </Button>
        </div>
      </form>

      {error && renderError()}

      {result && !refinedWithContext && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-medium">Refined</h2>
            <div className="flex items-center gap-2">
              {/* Enhancement source/time removed from display but kept in metadata */}
            </div>
          </div>
          <div className="bg-white-soft p-4 rounded border border-gray-10 text-sm whitespace-pre-wrap w-full">{result}</div>
          
          <div className="mt-3">
            <div className="flex justify-end gap-2 mt-3">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => copyPromptToClipboard(result)}
                className="transition-all duration-200 ease-in-out hover:bg-gray-100 h-9 border border-gray-200"
              >
                <ClipboardIcon size={16} className="mr-2" />
                Copy
              </Button>
              
              <Button 
                size="sm" 
                className="bg-black-primary hover:bg-black-rich text-white-pure h-9 border border-transparent" 
                onClick={handleExpand}
              >
                <RotateCw size={16} className="mr-2" />
                Repeat
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="transition-all duration-200 ease-in-out hover:bg-gray-100 h-9 border border-gray-200"
                  >
                    <Share size={16} className="mr-2" />
                    Relay
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="start" 
                  sideOffset={5}
                  className="min-w-[180px] bg-white rounded-md shadow-md border border-gray-200 p-1 animate-in fade-in-80 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
                >
                  <DropdownMenuLabel className="text-gray-700 px-2 py-1.5">Relay to:</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-200 my-1" />
                  <DropdownMenuItem 
                    onClick={() => openExternalSite("https://chat.openai.com/", "ChatGPT")}
                    className="cursor-pointer rounded-sm flex items-center px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:text-gray-900"
                  >
                    <ExternalLink className="w-4 h-4 mr-2 text-gray-500" />
                    <span>ChatGPT</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => openExternalSite("https://claude.ai/", "Claude")}
                    className="cursor-pointer rounded-sm flex items-center px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:text-gray-900"
                  >
                    <ExternalLink className="w-4 h-4 mr-2 text-gray-500" />
                    <span>Claude</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => openExternalSite("https://chat.mistral.ai/", "Mistral")}
                    className="cursor-pointer rounded-sm flex items-center px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:text-gray-900"
                  >
                    <ExternalLink className="w-4 h-4 mr-2 text-gray-500" />
                    <span>Mistral</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-200 my-1" />
                  <DropdownMenuItem 
                    onClick={() => {
                      copyPromptToClipboard(result);
                      toast.info("Copied to paste into Cursor AI", {
                        position: "bottom-center",
                        className: "bg-slate-800 text-white"
                      });
                    }}
                    className="cursor-pointer rounded-sm flex items-center px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:text-gray-900"
                  >
                    <ExternalLink className="w-4 h-4 mr-2 text-gray-500" />
                    <span>Cursor</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => {
                      copyPromptToClipboard(result);
                      toast.info("Copied to paste into VS Code", {
                        position: "bottom-center",
                        className: "bg-slate-800 text-white"
                      });
                    }}
                    className="cursor-pointer rounded-sm flex items-center px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:text-gray-900"
                  >
                    <ExternalLink className="w-4 h-4 mr-2 text-gray-500" />
                    <span>VS Code</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {showFeedback && (
            <div className="mt-4">
              <FeedbackForm 
                originalPrompt={prompt}
                enhancedPrompt={result}
                onClose={() => setShowFeedback(false)}
              />
            </div>
          )}
        </div>
      )}

      {refinedWithContext && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-medium">Refined+ (with context)</h2>
            <div className="flex items-center gap-2">
              {/* Enhancement source/time removed from display but kept in metadata */}
            </div>
          </div>
          <div className="bg-white-soft p-4 rounded border border-gray-10 text-sm whitespace-pre-wrap w-full">
            {refinedWithContext}
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => copyPromptToClipboard(refinedWithContext)}
              className="transition-all duration-200 ease-in-out hover:bg-gray-100 h-9 border border-gray-200"
            >
              <ClipboardIcon size={16} className="mr-2" />
              Copy
            </Button>
            
            <Button 
              size="sm" 
              className="bg-black-primary hover:bg-black-rich text-white-pure h-9 border border-transparent" 
              onClick={handleExpand}
            >
              <RotateCw size={16} className="mr-2" />
              Repeat
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="transition-all duration-200 ease-in-out hover:bg-gray-100 h-9 border border-gray-200"
                >
                  <Share size={16} className="mr-2" />
                  Relay
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="start" 
                sideOffset={5}
                className="min-w-[180px] bg-white rounded-md shadow-md border border-gray-200 p-1 animate-in fade-in-80 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
              >
                <DropdownMenuLabel className="text-gray-700 px-2 py-1.5">Relay to:</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-200 my-1" />
                <DropdownMenuItem 
                  onClick={() => openExternalSite("https://chat.openai.com/", "ChatGPT")}
                  className="cursor-pointer rounded-sm flex items-center px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:text-gray-900"
                >
                  <ExternalLink className="w-4 h-4 mr-2 text-gray-500" />
                  <span>ChatGPT</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => openExternalSite("https://claude.ai/", "Claude")}
                  className="cursor-pointer rounded-sm flex items-center px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:text-gray-900"
                >
                  <ExternalLink className="w-4 h-4 mr-2 text-gray-500" />
                  <span>Claude</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => openExternalSite("https://chat.mistral.ai/", "Mistral")}
                  className="cursor-pointer rounded-sm flex items-center px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:text-gray-900"
                >
                  <ExternalLink className="w-4 h-4 mr-2 text-gray-500" />
                  <span>Mistral</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-200 my-1" />
                <DropdownMenuItem 
                  onClick={() => {
                    copyPromptToClipboard(refinedWithContext);
                    toast.info("Copied to paste into Cursor AI", {
                      position: "bottom-center",
                      className: "bg-slate-800 text-white"
                    });
                  }}
                  className="cursor-pointer rounded-sm flex items-center px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:text-gray-900"
                >
                  <ExternalLink className="w-4 h-4 mr-2 text-gray-500" />
                  <span>Cursor</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    copyPromptToClipboard(refinedWithContext);
                    toast.info("Copied to paste into VS Code", {
                      position: "bottom-center",
                      className: "bg-slate-800 text-white"
                    });
                  }}
                  className="cursor-pointer rounded-sm flex items-center px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:text-gray-900"
                >
                  <ExternalLink className="w-4 h-4 mr-2 text-gray-500" />
                  <span>VS Code</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {showFeedback && (
            <div className="mt-4">
              <FeedbackForm 
                originalPrompt={prompt}
                enhancedPrompt={refinedWithContext}
                onClose={() => setShowFeedback(false)}
              />
            </div>
          )}
        </div>
      )}
      
      {/* Recollect / Audit Trail */}
      {hasRefinedPrompt && (
        <div className="mt-8 border rounded-lg p-4 bg-white">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <Clock size={16} />
              <h3 className="text-base font-medium">Receipt(s)</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-500">
                {promptHistory.length} {promptHistory.length === 1 ? 'record' : 'records'}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 w-8 p-0",
                  showHistory ? "bg-gray-100" : "bg-transparent"
                )}
                onClick={() => setShowHistory(!showHistory)}
              >
                {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </Button>
            </div>
          </div>
          
          {showHistory && (
            <div className="mt-2">
              {promptHistory.length > 0 ? (
                <div className="border border-gray-100 rounded-md overflow-hidden">
                  <div className="max-h-[400px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Recency</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Raw</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Refined</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {promptHistory.map((item, index) => (
                          <React.Fragment key={index}>
                            <tr 
                              className={index % 2 === 0 ? "bg-white hover:bg-gray-100" : "bg-gray-50 hover:bg-gray-100"}
                              onClick={() => toggleExpandItem(index)}
                            >
                              <td className="px-3 py-2 align-top whitespace-nowrap">
                                {(() => {
                                  const now = new Date();
                                  const timestamp = new Date(item.timestamp);
                                  const diffMs = now.getTime() - timestamp.getTime();
                                  const diffMins = Math.floor(diffMs / (1000 * 60));
                                  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                                  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                  
                                  if (diffMins < 1) return 'Just now';
                                  if (diffMins === 1) return '1 minute ago';
                                  if (diffMins < 60) return `${diffMins} minutes ago`;
                                  if (diffHours === 1) return '1 hour ago';
                                  if (diffHours < 24) return `${diffHours} hours ago`;
                                  if (diffDays === 1) return 'Yesterday';
                                  if (diffDays < 7) return `${diffDays} days ago`;
                                  return timestamp.toLocaleDateString();
                                })()}
                              </td>
                              <td className="px-3 py-2 align-top">
                                <div className="max-w-[150px] truncate cursor-help" title={item.original}>
                                  {item.original.substring(0, 50)}
                                  {item.original.length > 50 ? "..." : ""}
                                </div>
                                {item.context && (
                                  <div className="mt-1 text-gray-500 italic max-w-[150px] truncate cursor-help" title={item.context}>
                                    Context: {item.context.substring(0, 30)}
                                    {item.context.length > 30 ? "..." : ""}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2 align-top">
                                <div className="max-w-[200px] truncate cursor-help" title={item.refined}>
                                  {item.refined.substring(0, 70)}
                                  {item.refined.length > 70 ? "..." : ""}
                                </div>
                              </td>
                              <td className="px-3 py-2 align-top whitespace-nowrap">
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 flex items-center justify-center hover:bg-gray-200 rounded-md border border-transparent"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPrompt(item.refined);
                                    }}
                                    title="Use this prompt"
                                  >
                                    <RotateCw size={14} />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 flex items-center justify-center hover:bg-gray-200 rounded-md border border-transparent"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyToClipboard(item.refined);
                                    }}
                                    title="Copy to clipboard"
                                  >
                                    <Copy size={14} />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 flex items-center justify-center hover:bg-gray-200 rounded-md border border-transparent"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleExpandItem(index);
                                    }}
                                    title={expandedItems.has(index) ? "Collapse" : "Expand"}
                                  >
                                    {expandedItems.has(index) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                            {expandedItems.has(index) && (
                              <tr className="border-t border-gray-100">
                                <td colSpan={4} className="px-4 py-3 bg-white">
                                  <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                      <div className="font-medium mb-1 text-gray-600">Original:</div>
                                      <div className="bg-gray-50 p-2 rounded border border-gray-200 whitespace-pre-wrap">
                                        {item.original}
                                      </div>
                                      {item.context && (
                                        <>
                                          <div className="font-medium mt-2 mb-1 text-gray-600">Context:</div>
                                          <div className="bg-gray-50 p-2 rounded border border-gray-200 whitespace-pre-wrap">
                                            {item.context}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                    <div>
                                      <div className="font-medium mb-1 text-gray-600">Refined:</div>
                                      <div className="bg-gray-50 p-2 rounded border border-gray-200 whitespace-pre-wrap">
                                        {item.refined}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center p-4 bg-gray-50 rounded-md border border-dashed border-gray-200">
                  <div className="text-gray-500">No prompt history yet</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Add this to the form to display chunking progress */}
      {isLoading && processingChunks && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-600 text-sm">
          <div className="flex items-center">
            <Loader2 size={16} className="mr-2 animate-spin" />
            <span>Processing large prompt in chunks: {currentChunk} of {totalChunks}</span>
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${(currentChunk / totalChunks) * 100}%` }}
              ></div>
            </div>
          </div>
          {combinedResult && (
            <div className="mt-3 max-h-40 overflow-y-auto text-xs bg-white p-2 rounded">
              <div className="font-semibold mb-1">Progress preview:</div>
              {combinedResult}
            </div>
          )}
        </div>
      )}
      
      {chunkingNotification && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-600 text-sm">
          <div className="flex items-center">
            <Loader2 size={16} className="mr-2 animate-spin" />
            <span>{chunkingNotification}</span>
          </div>
        </div>
      )}
      
      <SimpleToast show={copied} message="Copied to clipboard!" />
    </div>
  )
}

