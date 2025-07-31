"use client"

import React from "react"

import { useState, useEffect, useCallback } from "react"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { Loader2, Send, Copy, Check, Info, X, ChevronDown, ChevronUp, RotateCw, Zap, Clock } from "lucide-react"
import FeedbackForm from "./feedback-form"

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

  // Load existing history when component mounts
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch('/api/engineer/history');
        if (response.ok) {
          const data = await response.json();
          if (data.items && Array.isArray(data.items) && data.items.length > 0) {
            setPromptHistory(data.items);
            setHasRefinedPrompt(true); // Set flag if we load any history items
            console.log(`Loaded ${data.items.length} history items`);
          }
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
          const date = new Date(item.timestamp)
          return {
            ...item,
            timestamp: isNaN(date.getTime()) ? new Date() : date
          }
        })
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
    const historyItem: PromptHistoryItem = {
      original,
      refined,
      context: contextValue,
      timestamp: new Date(),
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
      await fetch('/api/engineer/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(item),
      })
    } catch (error) {
      console.error('Failed to store prompt history for training:', error)
    }
  }

  // Define handleSubmit with useCallback to avoid dependency issues
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    if (!prompt.trim()) return

    setIsLoading(true)
    setError(null)
    setShowFeedback(false)
    setRefinedWithContext("")
    setEnhancementSource(null)
    setEnhancementTime(null)

    try {
      // Check multiple ways to determine if this is a refinement
      const lastRefinedPrompt = localStorage.getItem('lastRefinedPrompt')
      const isInHistory = promptHistory.some(item => item.refined === prompt.trim())
      const wasLastRefined = lastRefinedPrompt === prompt.trim()
      
      // Consider it a refinement if it matches previous history OR the last refined prompt
      const isRefinement = isInHistory || wasLastRefined
      
      // Check if this is an expansion request (from Repeat button)
      const repeatType = localStorage.getItem('repeatType')
      const repeatCount = parseInt(localStorage.getItem('repeatCount') || '0')
      const isExpansion = repeatType === 'expand' && repeatCount > 0
      
      // If we're not sure if it's refined, ask the user
      if (isLikelyRefined(prompt) && !isRefinement && !isExpansion && !confirm("This prompt appears to be already refined. Continue with refinement?")) {
        setIsLoading(false)
        return
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
          prompt,
          context: context || "",
          isRefinement,  // Flag to indicate this is a refinement iteration
          isExpansion,   // Flag to indicate this is an expansion request
          repeatCount    // Counter for how many times repeated
        }),
      })

      const data: EngineerResponse = await response.json()
      
      if (response.ok && data.result) {
        setResult(data.result)
        addToHistory(prompt, data.result, context, data.metadata)
        
        // Also set enhanced prompt with context if context is provided
        if (context) {
          setRefinedWithContext(`Context: ${context}\n\nPrompt: ${data.result}`)
        }
        
        // Store the last refined prompt for comparison in future requests
        localStorage.setItem('lastRefinedPrompt', data.result)
        
        // Store enhancement source and time information if available
        if (data.metadata) {
          if (data.metadata.source) {
            setEnhancementSource(data.metadata.source)
          }
          if (data.metadata.processingTime) {
            setEnhancementTime(data.metadata.processingTime)
          }
        }
      } else {
        throw new Error(data.result || 'Failed to enhance prompt')
      }
    } catch (error) {
      console.error('Error enhancing prompt:', error)
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [prompt, context, promptHistory, addToHistory])

  // Check if a prompt is already refined
  const isLikelyRefined = useCallback((text: string): boolean => {
    const isLong = text.length > 150
    const hasStructure = text.includes(', ') && text.includes('.')
    const hasSpecifics = text.includes('include') || text.includes('sections') || text.includes('design')
    
    return isLong && hasStructure && hasSpecifics
  }, [])

  // Add keyboard shortcut for refine action
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+Enter (Mac) or Ctrl+Enter (Windows)
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        const activeElement = document.activeElement;
        
        // Only trigger if focus is in the prompt textarea
        if (activeElement && activeElement.id === 'promptTextarea' && prompt.trim()) {
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
  }, [prompt, handleSubmit]); // Include handleSubmit in dependencies

  // Define function for refining with context
  const handleRefineWithContext = useCallback(async () => {
    if (!result.trim() || !context.trim()) return

    setIsLoadingContext(true)
    setError(null)

    try {
      const response = await fetch('/api/engineer', {
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

  // Format timestamp for display
  const formatTime = (date: Date): string => {
    // Validate date object first
    if (!date || isNaN(date.getTime())) {
      return 'Just now'
    }
    
    // Calculate time since the event
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  // Toggle expanded state for a history item
  const toggleExpandItem = (index: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
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
    fetch('/api/engineer/feedback', {
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

  return (
    <div className="w-full max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold tracking-tight">
          <a href="https://zeidgeist.vercel.app" className="text-black hover:text-gray-700 transition-colors">
            zeidgeistdotcom
          </a>
          <span className="text-gray-400 text-sm ml-2">v0.6.8</span>
        </h1>
      </div>

      <div className="grid gap-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-medium">Raw</h2>
            {(prompt || context || result || refinedWithContext) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setPrompt("")
                  setContext("")
                  setResult("")
                  setRefinedWithContext("")
                  setEnhancementSource(null)
                  setShowFeedback(false)
                  setShowContext(false)
                }}
                className="h-8 w-8"
              >
                <X size={16} />
              </Button>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div>
              <Textarea
                id="promptTextarea"
                placeholder="Ramble..."
                className="resize-none h-24 border-gray-30 focus-visible:ring-black-primary"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-500">Press {navigator.platform.includes('Mac') ? '⌘+Return' : 'Ctrl+Enter'} to refine</div>
              <Button
                type="submit"
                size="sm"
                className="bg-black-primary hover:bg-black-rich text-white-pure"
                disabled={isLoading || !prompt.trim()}
                title={`${navigator.platform.includes('Mac') ? '⌘+Return' : 'Ctrl+Enter'}`}
              >
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                <span className="ml-1">Refactor</span>
              </Button>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
              {error}
            </div>
          )}

          {result && !refinedWithContext && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-medium">Refined</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(result)}
                  className="h-7 text-gray-60 hover:text-black-primary"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </Button>
              </div>
              <div className="bg-white-soft p-3 rounded border border-gray-10 text-sm whitespace-pre-wrap">{result}</div>
              
              {/* Enhancement metadata display */}
              {(enhancementSource || enhancementTime !== null) && (
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                  {enhancementSource && (
                    <div className="flex items-center gap-1">
                      <Zap size={12} />
                      <span>Enhanced by: {enhancementSource === 'external-api' ? 'AI' : enhancementSource}</span>
                    </div>
                  )}
                  {enhancementTime !== null && (
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>{enhancementTime}ms</span>
                    </div>
                  )}
                </div>
              )}
              
              <div className="mt-3">
                <div className="flex justify-between items-center">
                  <Button
                    type="button"
                    variant={showContext ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowContext(!showContext)}
                    className="text-gray-60 hover:text-black-primary"
                  >
                    <Info size={14} className="mr-1" />
                    Add Context
                    {showContext ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />}
                  </Button>
                  
                  <div className="flex gap-2">
                    {!showFeedback && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowFeedback(true)}
                      >
                        Give Feedback
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      className="bg-black-primary hover:bg-black-rich text-white-pure" 
                      onClick={handleExpand}
                    >
                      <RotateCw size={14} className="mr-1" />
                      Repeat
                    </Button>
                  </div>
                </div>
                
                {showContext && (
                  <div className="mt-3 space-y-3">
                    <Textarea
                      placeholder="Add contextual information..."
                      className="resize-none h-20 border-gray-30 focus-visible:ring-black-primary"
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white-pure"
                        onClick={handleRefineWithContext}
                        disabled={isLoadingContext || !context.trim()}
                      >
                        {isLoadingContext ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                        <span className="ml-1">Refine+</span>
                      </Button>
                    </div>
                  </div>
                )}
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(refinedWithContext)}
                  className="h-7 text-gray-60 hover:text-black-primary"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </Button>
              </div>
              <div className="bg-white-soft p-3 rounded border border-gray-10 text-sm whitespace-pre-wrap">
                {refinedWithContext}
              </div>
              
              {/* Enhancement metadata display for context refinement */}
              {(enhancementSource || enhancementTime !== null) && (
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                  {enhancementSource && (
                    <div className="flex items-center gap-1">
                      <Zap size={12} />
                      <span>Enhanced by: {enhancementSource === 'external-api' ? 'AI' : enhancementSource}</span>
                    </div>
                  )}
                  {enhancementTime !== null && (
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>{enhancementTime}ms</span>
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex justify-end gap-2 mt-3">
                {!showFeedback && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowFeedback(true)}
                  >
                    Give Feedback
                  </Button>
                )}
                <Button 
                  size="sm" 
                  className="bg-black-primary hover:bg-black-rich text-white-pure" 
                  onClick={handleExpand}
                >
                  <RotateCw size={14} className="mr-1" />
                  Repeat
                </Button>
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
          
          {/* Prompt History / Audit Trail */}
          {hasRefinedPrompt && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-medium">Receipt{promptHistory.length === 1 ? '' : 's'} ({promptHistory.length} record{promptHistory.length === 1 ? '' : 's'})</h2>
                <Button
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowHistory(!showHistory)}
                  className="h-7"
                >
                  {showHistory ? "Hide" : "Show"}
                </Button>
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
                                  <td className="px-3 py-2 align-top whitespace-nowrap">{formatTime(item.timestamp)}</td>
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
                                        className="h-6 w-6 hover:bg-gray-200"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPrompt(item.refined);
                                        }}
                                        title="Use this prompt"
                                      >
                                        <RotateCw size={12} />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 hover:bg-gray-200"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          copyToClipboard(item.refined);
                                        }}
                                        title="Copy to clipboard"
                                      >
                                        <Copy size={12} />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 hover:bg-gray-200"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleExpandItem(index);
                                        }}
                                        title={expandedItems.has(index) ? "Collapse" : "Expand"}
                                      >
                                        {expandedItems.has(index) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
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
        </div>
      </div>
      
      <SimpleToast show={copied} message="Copied to clipboard!" />
    </div>
  )
}

