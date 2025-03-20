"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react"

interface FeedbackFormProps {
  originalPrompt: string
  enhancedPrompt: string
  onClose: () => void
}

export default function FeedbackForm({
  originalPrompt,
  enhancedPrompt,
  onClose
}: FeedbackFormProps) {
  const [wasSuccessful, setWasSuccessful] = useState<boolean | null>(null)
  const [feedback, setFeedback] = useState("")
  const [showFeedbackInput, setShowFeedbackInput] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
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
          originalPrompt,
          enhancedPrompt,
          wasSuccessful,
          feedback: feedback.trim() || undefined
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit feedback')
      }

      setIsSubmitted(true)
      setTimeout(onClose, 2000) // Auto close after 2 seconds
    } catch (err) {
      console.error('Error submitting feedback:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
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
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={wasSuccessful === null || isSubmitting}
              className="bg-black-primary hover:bg-black-rich"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
} 