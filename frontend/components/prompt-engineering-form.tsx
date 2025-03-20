"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, Send, Copy, Check, ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react"

interface FeedbackFormProps {
  originalPrompt: string
  enhancedPrompt: string
  onClose: () => void
}

export default function PromptEngineeringForm() {
  const [prompt, setPrompt] = useState("")
  const [context, setContext] = useState("")
  const [result, setResult] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [wasSuccessful, setWasSuccessful] = useState<boolean | null>(null)
  const [feedback, setFeedback] = useState("")
  const [showFeedbackInput, setShowFeedbackInput] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!prompt.trim()) return

    setIsLoading(true)

    // Simulate API call
    setTimeout(() => {
      // This is where you would call your actual API
      const engineeredPrompt = generateEngineeredPrompt(prompt, context)
      setResult(engineeredPrompt)
      setIsLoading(false)
    }, 1500)
  }

  const generateEngineeredPrompt = (userPrompt: string, userContext: string) => {
    // This is a placeholder for your actual prompt engineering logic
    let engineered = userPrompt

    // Add context if provided
    if (userContext) {
      engineered = `Context: ${userContext}\n\nPrompt: ${userPrompt}`
    }

    // Add some basic enhancements
    engineered = `I want you to respond to the following prompt. Be detailed, accurate, and helpful in your response.\n\n${engineered}`

    return engineered
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleFeedbackSubmit = async () => {
    if (wasSuccessful === null) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/engineer/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalPrompt: prompt,
          enhancedPrompt: result,
          wasSuccessful,
          feedback: feedback.trim() || undefined
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit feedback')
      }

      setIsSubmitted(true)
      setTimeout(() => {
        setWasSuccessful(null)
        setShowFeedbackInput(false)
        setFeedback("")
      }, 2000) // Auto close after 2 seconds
    } catch (err) {
      console.error('Error submitting feedback:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      <Card className="border border-gray-20">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="prompt" className="text-sm font-medium">
                Your Prompt
              </Label>
              <Textarea
                id="prompt"
                placeholder="Enter your prompt here..."
                className="min-h-32 resize-y border-gray-30"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="context" className="text-sm font-medium">
                Additional Context (Optional)
              </Label>
              <Textarea
                id="context"
                placeholder="Add any additional context that might help improve the prompt..."
                className="min-h-24 resize-y border-gray-30"
                value={context}
                onChange={(e) => setContext(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-black-primary hover:bg-black-rich text-white-pure"
              disabled={isLoading || !prompt.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Optimizing...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Optimize Prompt
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card className="border border-gray-20">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-2">
              <Label className="text-sm font-medium">Engineered Prompt</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyToClipboard}
                className="text-gray-60 hover:text-black-primary"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <div className="bg-white-soft p-4 rounded-md border border-gray-10 whitespace-pre-wrap">{result}</div>
          </CardContent>
        </Card>
      )}

      {wasSuccessful !== null && !isSubmitted && (
        <div className="bg-white-pure p-4 border border-gray-30 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium mb-3">Was this enhancement helpful?</h3>
          
          {isSubmitted ? (
            <div className="text-center py-2 text-green-600 text-sm">
              Thank you for your feedback!
            </div>
          ) : (
            <>
              <div className="flex gap-3 mb-4">
                <Button
                  variant={wasSuccessful === true ? "default" : "outline"}
                  size="sm"
                  onClick={() => setWasSuccessful(true)}
                  className={wasSuccessful === true ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  <ThumbsUp size={16} className="mr-1" />
                  Yes
                </Button>
                <Button
                  variant={wasSuccessful === false ? "default" : "outline"}
                  size="sm"
                  onClick={() => setWasSuccessful(false)}
                  className={wasSuccessful === false ? "bg-red-600 hover:bg-red-700" : ""}
                >
                  <ThumbsDown size={16} className="mr-1" />
                  No
                </Button>
                {wasSuccessful !== null && !showFeedbackInput && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFeedbackInput(true)}
                  >
                    <MessageSquare size={16} className="mr-1" />
                    Add comment
                  </Button>
                )}
              </div>

              {showFeedbackInput && (
                <div className="mb-4">
                  <Textarea
                    placeholder="Any additional feedback..."
                    className="resize-none h-20 mb-2"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                </div>
              )}

              {error && (
                <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-xs">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setWasSuccessful(null)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleFeedbackSubmit}
                  disabled={wasSuccessful === null || isSubmitting}
                  className="bg-black-primary hover:bg-black-rich"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

